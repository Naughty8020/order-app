//go:build integration

package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"gorm.io/gorm"
	"order-system/config"
	"order-system/internal/testdb"
	"order-system/models"
)

func integrationApp(t *testing.T) (http.Handler, *gorm.DB) {
	t.Helper()
	t.Setenv("JWT_SECRET", "integration-only-secret-at-least-32-bytes")
	t.Setenv("ORDER_ACCESS_SECRET", "integration-only-qr-secret")
	t.Setenv("ADMIN_USERNAME", "integration-admin")
	t.Setenv("ADMIN_PASSWORD", "integration-password")
	db, cleanup, err := testdb.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := cleanup(); err != nil {
			t.Error(err)
		}
	})
	if err := config.SeedAdmin(db); err != nil {
		t.Fatal(err)
	}
	router, err := NewRouter(db)
	if err != nil {
		t.Fatal(err)
	}
	return router, db
}

func api(t *testing.T, router http.Handler, method, path, body string, headers map[string]string, status int) []byte {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)
	if res.Code != status {
		t.Fatalf("%s %s: status=%d want=%d body=%s", method, path, res.Code, status, res.Body.String())
	}
	return res.Body.Bytes()
}
func decode[T any](t *testing.T, body []byte) T {
	t.Helper()
	var value T
	if err := json.Unmarshal(body, &value); err != nil {
		t.Fatal(err)
	}
	return value
}
func login(t *testing.T, r http.Handler) map[string]string {
	t.Helper()
	body := api(t, r, "POST", "/api/login", `{"userName":"integration-admin","password":"integration-password"}`, nil, 200)
	token := decode[map[string]string](t, body)["token"]
	if token == "" {
		t.Fatal("missing JWT")
	}
	return map[string]string{"Authorization": "Bearer " + token}
}
func orderSession(t *testing.T, r http.Handler, auth map[string]string) map[string]string {
	t.Helper()
	qr := decode[map[string]string](t, api(t, r, "GET", "/api/order-access/qr", "", auth, 200))
	body, _ := json.Marshal(map[string]string{"token": qr["token"]})
	session := decode[map[string]string](t, api(t, r, "POST", "/api/order-access/session", string(body), nil, 201))
	if session["session_token"] == "" {
		t.Fatal("missing session")
	}
	return map[string]string{"X-Order-Session": session["session_token"]}
}

func TestIntegrationOrderingFlow(t *testing.T) {
	r, db := integrationApp(t)
	auth := login(t, r)
	menuResponse := decode[struct {
		Data models.Menu `json:"data"`
	}](t, api(t, r, "POST", "/api/menus", `{"name":"結合テストのお茶","price":200,"is_available":true,"is_recommended":true,"is_featured":true}`, auth, 201))
	menu := menuResponse.Data
	if menu.ID == 0 || !menu.IsRecommended || !menu.IsFeatured {
		t.Fatalf("menu = %+v", menu)
	}
	session := orderSession(t, r, auth)
	body := fmt.Sprintf(`{"items":[{"menu_id":%d,"quantity":2}]}`, menu.ID)
	created := decode[struct {
		models.Order
		ReceiptToken string `json:"receipt_token"`
	}](t, api(t, r, "POST", "/api/orders", body, session, 201))
	if created.ID == 0 || created.Status != "pending" || len(created.OrderItems) != 1 {
		t.Fatalf("order = %+v", created)
	}
	item := created.OrderItems[0]
	if item.Quantity != 2 || item.Price != 200 || item.Menu.Name != menu.Name {
		t.Fatalf("item = %+v", item)
	}
	// 別のDB読み取りで、HTTPの応答だけでなく永続化も確認する。
	var stored models.Order
	if err := db.Preload("OrderItems").First(&stored, created.ID).Error; err != nil {
		t.Fatal(err)
	}
	if len(stored.OrderItems) != 1 || stored.OrderItems[0].Quantity != 2 {
		t.Fatalf("stored = %+v", stored)
	}
	receiptPath := fmt.Sprintf("/api/orders/%d/receipt", created.ID)
	receiptHeaders := map[string]string{"X-Order-Receipt": created.ReceiptToken}
	if len(created.ReceiptToken) != 43 || stored.ReceiptTokenHash == created.ReceiptToken {
		t.Fatal("receipt credential was not hashed")
	}
	api(t, r, "GET", receiptPath, "", nil, 410)
	api(t, r, "GET", receiptPath, "", map[string]string{"X-Order-Receipt": strings.Repeat("z", 43)}, 410)
	receipt := decode[models.Order](t, api(t, r, "GET", receiptPath, "", receiptHeaders, 200))
	if receipt.ID != created.ID || len(receipt.OrderItems) != 1 {
		t.Fatal("receipt missing items")
	}
	public := string(api(t, r, "GET", "/api/orders/public", "", nil, 200))
	if strings.Contains(public, "order_items") || strings.Contains(public, "receipt") || strings.Contains(public, menu.Name) {
		t.Fatal("public endpoint exposed details")
	}
	for _, status := range []string{"ready", "completed"} {
		updated := decode[models.Order](t, api(t, r, "PUT", fmt.Sprintf("/api/orders/%d/status", created.ID), fmt.Sprintf(`{"status":%q}`, status), auth, 200))
		if updated.Status != status {
			t.Errorf("status=%s want=%s", updated.Status, status)
		}
	}
	orders := decode[struct {
		Orders []models.Order `json:"orders"`
	}](t, api(t, r, "GET", "/api/orders", "", auth, 200))
	if len(orders.Orders) != 1 || orders.Orders[0].Status != "completed" {
		t.Fatalf("orders = %+v", orders)
	}
	// Receipt access remains valid after the ordering session expires.
	if err := db.Model(&models.OrderSession{}).Where("1 = 1").Update("expires_at", time.Now().Add(-time.Hour)).Error; err != nil {
		t.Fatal(err)
	}
	receipt = decode[models.Order](t, api(t, r, "GET", receiptPath, "", receiptHeaders, 200))
	if receipt.Status != "completed" {
		t.Fatal("completed receipt unavailable")
	}
	// 価格変更が過去の注文明細に影響しないこと、falseも保存できることを確認。
	updated := decode[struct {
		Data models.Menu `json:"data"`
	}](t, api(t, r, "PUT", fmt.Sprintf("/api/menus/%d", menu.ID), `{"name":"変更後のお茶","price":300,"is_available":false,"is_recommended":false,"is_featured":false}`, auth, 200))
	if updated.Data.Price != 300 || updated.Data.IsAvailable || updated.Data.IsRecommended || updated.Data.IsFeatured {
		t.Fatalf("updated menu=%+v", updated)
	}
	var savedItem models.OrderItem
	if err := db.First(&savedItem, item.ID).Error; err != nil {
		t.Fatal(err)
	}
	if savedItem.Price != 200 {
		t.Error("past order price changed")
	}
	api(t, r, "DELETE", fmt.Sprintf("/api/menus/%d", menu.ID), "", auth, 200)
	menus := decode[struct {
		Data []models.Menu `json:"data"`
	}](t, api(t, r, "GET", "/api/menus", "", nil, 200))
	if len(menus.Data) != 0 {
		t.Fatalf("deleted menu is visible: %+v", menus)
	}
	var deleted models.Menu
	if err := db.Unscoped().First(&deleted, menu.ID).Error; err != nil {
		t.Fatal(err)
	}
	if !deleted.DeletedAt.Valid {
		t.Error("menu was not soft-deleted")
	}
	receipt = decode[models.Order](t, api(t, r, "GET", receiptPath, "", receiptHeaders, 200))
	if receipt.OrderItems[0].Name != menu.Name || receipt.OrderItems[0].Price != 200 {
		t.Fatal("receipt changed after menu edit/delete")
	}
	if err := db.Model(&models.Order{}).Where("id = ?", created.ID).Update("receipt_expires_at", time.Now().Add(-time.Second)).Error; err != nil {
		t.Fatal(err)
	}
	api(t, r, "GET", receiptPath, "", receiptHeaders, 410)
}

func TestIntegrationLegacyOrderAndPublicProjection(t *testing.T) {
	r, db := integrationApp(t)
	auth := login(t, r)
	// Simulate pre-receipt rows after AutoMigrate adds a nullable expiry.
	if err := db.Exec("INSERT INTO orders (id, status, created_at, receipt_expires_at) VALUES (101, 'pending', NOW(), NULL), (102, 'ready', NOW(), NULL), (103, 'completed', NOW(), NULL)").Error; err != nil {
		t.Fatal(err)
	}
	public := string(api(t, r, "GET", "/api/orders/public", "", nil, 200))
	if public != `{"orders":[{"id":101,"status":"pending"},{"id":102,"status":"ready"}]}` {
		t.Fatalf("public response = %s", public)
	}
	api(t, r, "GET", "/api/orders/101/receipt", "", map[string]string{"X-Order-Receipt": strings.Repeat("a", 43)}, 410)
	for _, status := range []string{"ready", "completed"} {
		api(t, r, "PUT", "/api/orders/101/status", fmt.Sprintf(`{"status":%q}`, status), auth, 200)
		var saved models.Order
		if err := db.First(&saved, 101).Error; err != nil {
			t.Fatal(err)
		}
		if saved.Status != status || saved.ReceiptExpiresAt != nil {
			t.Fatalf("legacy order status=%s expiry=%v", saved.Status, saved.ReceiptExpiresAt)
		}
	}
	api(t, r, "PUT", "/api/orders/101/status", `{"status":"ready"}`, auth, 409)
	var completed models.Order
	if err := db.First(&completed, 101).Error; err != nil {
		t.Fatal(err)
	}
	if completed.Status != "completed" {
		t.Fatalf("completed order was changed: %s", completed.Status)
	}
	api(t, r, "PUT", "/api/orders/102/status", `{"status":"completed"}`, auth, 200)
	if public := string(api(t, r, "GET", "/api/orders/public", "", nil, 200)); public != `{"orders":[]}` {
		t.Fatalf("empty public response = %s", public)
	}
}

func TestIntegrationRejectedRequests(t *testing.T) {
	for _, tt := range []struct {
		name, method, path, body string
		auth                     bool
		status                   int
	}{
		{"ログイン失敗", "POST", "/api/login", `{"userName":"integration-admin","password":"wrong"}`, false, 401},
		{"ログイン入力不足", "POST", "/api/login", `{}`, false, 400},
		{"管理者認証なしで作成", "POST", "/api/menus", `{"name":"お茶","price":200}`, false, 401},
		{"認証なしでQR取得", "GET", "/api/order-access/qr", "", false, 401},
		{"認証なしで全注文取得", "GET", "/api/orders", "", false, 401},
		{"無効なQR", "POST", "/api/order-access/session", `{"token":"invalid"}`, false, 401},
		{"セッションなしで注文", "POST", "/api/orders", `{"items":[{"menu_id":1,"quantity":1}]}`, false, 401},
		{"メニュー価格が負数", "POST", "/api/menus", `{"name":"お茶","price":-1}`, true, 400},
		{"存在しないメニュー更新", "PUT", "/api/menus/999", `{"price":200}`, true, 404},
		{"存在しないメニュー削除", "DELETE", "/api/menus/999", "", true, 404},
	} {
		t.Run(tt.name, func(t *testing.T) {
			r, db := integrationApp(t)
			var auth map[string]string
			if tt.auth {
				auth = login(t, r)
			}
			api(t, r, tt.method, tt.path, tt.body, auth, tt.status)
			for _, model := range []any{&models.Order{}, &models.OrderItem{}, &models.Menu{}, &models.OrderSession{}} {
				var count int64
				if err := db.Model(model).Count(&count).Error; err != nil {
					t.Fatal(err)
				}
				if count != 0 {
					t.Errorf("rejected request persisted %T rows: %d", model, count)
				}
			}
		})
	}
}

func TestIntegrationOrderRateLimit(t *testing.T) {
	r, db := integrationApp(t)
	auth := login(t, r)
	session := orderSession(t, r, auth)
	menu := models.Menu{Name: "お茶", Price: 200, IsAvailable: true}
	if err := db.Create(&menu).Error; err != nil {
		t.Fatal(err)
	}
	body := fmt.Sprintf(`{"items":[{"menu_id":%d,"quantity":1}]}`, menu.ID)
	for _, tt := range []struct {
		name   string
		status int
	}{{"1回目", 201}, {"2回目", 201}, {"3回目", 201}, {"4回目は拒否", 429}} {
		t.Run(tt.name, func(t *testing.T) { api(t, r, "POST", "/api/orders", body, session, tt.status) })
	}
	var count int64
	if err := db.Model(&models.Order{}).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 3 {
		t.Fatalf("orders=%d want=3", count)
	}
	var saved models.OrderSession
	if err := db.First(&saved).Error; err != nil {
		t.Fatal(err)
	}
	if saved.OrderCount != 3 {
		t.Errorf("order count=%d", saved.OrderCount)
	}
	if err := db.Model(&saved).Update("window_start", time.Now().Add(-11*time.Minute)).Error; err != nil {
		t.Fatal(err)
	}
	api(t, r, "POST", "/api/orders", body, session, 201)
	if err := db.First(&saved, saved.ID).Error; err != nil {
		t.Fatal(err)
	}
	if saved.OrderCount != 1 {
		t.Errorf("reset count=%d", saved.OrderCount)
	}
	if err := db.Model(&saved).Update("expires_at", time.Now().Add(-time.Minute)).Error; err != nil {
		t.Fatal(err)
	}
	api(t, r, "POST", "/api/orders", body, session, 401)
	if err := db.Model(&models.Order{}).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 4 {
		t.Errorf("orders=%d want=4", count)
	}
}
