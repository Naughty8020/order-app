package order

import (
	"errors"
	"testing"

	"order-system/models"
)

type orderRepositoryMock struct {
	findPublicOrdersFn func() ([]models.PublicOrder, error)
	findAllFn          func() ([]models.Order, error)
	findByIDFn         func(uint) (*models.Order, error)
	findMenuByIDFn     func(uint) (*models.Menu, error)
	createOrderFn      func(*models.Order) error
	createOrderItemFn  func(*models.OrderItem) error
	saveFn             func(*models.Order) error
}

func (m *orderRepositoryMock) FindPublicOrders() ([]models.PublicOrder, error) {
	return m.findPublicOrdersFn()
}

func (m *orderRepositoryMock) FindAll() ([]models.Order, error) { return m.findAllFn() }
func (m *orderRepositoryMock) FindByID(id uint) (*models.Order, error) {
	return m.findByIDFn(id)
}
func (m *orderRepositoryMock) FindMenuByID(id uint) (*models.Menu, error) {
	return m.findMenuByIDFn(id)
}
func (m *orderRepositoryMock) CreateOrder(order *models.Order) error {
	return m.createOrderFn(order)
}
func (m *orderRepositoryMock) CreateOrderItem(item *models.OrderItem) error {
	return m.createOrderItemFn(item)
}
func (m *orderRepositoryMock) Save(order *models.Order) error { return m.saveFn(order) }

func TestCreateOrder(t *testing.T) {
	menus := map[uint]*models.Menu{
		7: {ID: 7, Price: 300, IsAvailable: true},
		2: {ID: 2, Price: 300, IsAvailable: true},
	}
	var createdItems []models.OrderItem
	repo := &orderRepositoryMock{
		createOrderFn: func(order *models.Order) error {
			if order.Status != "pending" {
				t.Errorf("status = %q, want pending", order.Status)
			}
			order.ID = 10
			return nil
		},
		findMenuByIDFn: func(id uint) (*models.Menu, error) { return menus[id], nil },
		createOrderItemFn: func(item *models.OrderItem) error {
			createdItems = append(createdItems, *item)
			return nil
		},
		findByIDFn: func(id uint) (*models.Order, error) {
			return &models.Order{ID: id, Status: "pending", OrderItems: createdItems}, nil
		},
	}
	usecase := NewOrderUsecase(repo)

	got, err := usecase.CreateOrder([]CreateOrderItemInput{
		{MenuID: 7, Quantity: 2, Option: "ジュース：オレンジジュース"},
		{MenuID: 2, Quantity: 1},
	})

	if err != nil {
		t.Fatalf("CreateOrder() error = %v", err)
	}
	if got.ID != 10 || got.Status != "pending" {
		t.Errorf("CreateOrder() = %+v", got)
	}
	if len(createdItems) != 2 {
		t.Fatalf("created items = %d, want 2", len(createdItems))
	}
	if createdItems[0].OrderID != 10 || createdItems[0].MenuID != 7 || createdItems[0].Quantity != 2 || createdItems[0].Price != 300 || createdItems[0].Option != "ジュース：オレンジジュース" {
		t.Errorf("first item = %+v", createdItems[0])
	}
	if createdItems[1].OrderID != 10 || createdItems[1].MenuID != 2 || createdItems[1].Quantity != 1 || createdItems[1].Price != 300 {
		t.Errorf("second item = %+v", createdItems[1])
	}
}

func TestCreateOrderRejectsEmptyItems(t *testing.T) {
	usecase := NewOrderUsecase(&orderRepositoryMock{})

	got, err := usecase.CreateOrder(nil)

	if got != nil {
		t.Errorf("order = %+v, want nil", got)
	}
	if err == nil || err.Error() != "order items cannot be empty" {
		t.Errorf("error = %v", err)
	}
}

func TestCreateOrderRejectsUnavailableMenu(t *testing.T) {
	itemCreated := false
	orderCreated := false
	repo := &orderRepositoryMock{
		createOrderFn: func(order *models.Order) error { orderCreated = true; return nil },
		findMenuByIDFn: func(id uint) (*models.Menu, error) {
			return &models.Menu{ID: id, IsAvailable: false}, nil
		},
		createOrderItemFn: func(item *models.OrderItem) error {
			itemCreated = true
			return nil
		},
	}
	usecase := NewOrderUsecase(repo)

	got, err := usecase.CreateOrder([]CreateOrderItemInput{{MenuID: 1, Quantity: 1}})

	if got != nil {
		t.Errorf("order = %+v, want nil", got)
	}
	if err == nil || err.Error() != "menu item is not available" {
		t.Errorf("error = %v", err)
	}
	if itemCreated {
		t.Error("CreateOrderItem() was called")
	}
	if orderCreated {
		t.Error("CreateOrder() was called")
	}
}

func TestCreateOrderValidatesOptionsBeforeCreatingOrder(t *testing.T) {
	tests := []struct {
		name   string
		menuID uint
		option string
	}{
		{name: "必須選択なし", menuID: 7},
		{name: "指定外のジュース", menuID: 8, option: "ジュース：リンゴジュース"},
		{name: "固定レシピにオプション", menuID: 9, option: "追加あり"},
		{name: "指定外のトッピング", menuID: 10, option: "コーラ垂らし：多め"},
		{name: "ソフトドリンクにオプション", menuID: 1, option: "氷なし"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orderCreated := false
			usecase := NewOrderUsecase(&orderRepositoryMock{
				findMenuByIDFn: func(id uint) (*models.Menu, error) {
					return &models.Menu{ID: id, IsAvailable: true}, nil
				},
				createOrderFn: func(order *models.Order) error {
					orderCreated = true
					return nil
				},
			})

			got, err := usecase.CreateOrder([]CreateOrderItemInput{{MenuID: tt.menuID, Quantity: 1, Option: tt.option}})
			if got != nil || !errors.Is(err, ErrInvalidOrderOption) {
				t.Fatalf("order = %+v, error = %v", got, err)
			}
			if orderCreated {
				t.Error("CreateOrder() was called")
			}
		})
	}
}

func TestCreateOrderReturnsRepositoryErrors(t *testing.T) {
	tests := []struct {
		name string
		repo *orderRepositoryMock
	}{
		{
			name: "注文保存エラー",
			repo: &orderRepositoryMock{
				findMenuByIDFn: func(id uint) (*models.Menu, error) {
					return &models.Menu{ID: id, IsAvailable: true}, nil
				},
				createOrderFn: func(order *models.Order) error { return errors.New("create failed") },
			},
		},
		{
			name: "メニュー取得エラー",
			repo: &orderRepositoryMock{
				createOrderFn:  func(order *models.Order) error { return nil },
				findMenuByIDFn: func(id uint) (*models.Menu, error) { return nil, errors.New("find failed") },
			},
		},
		{
			name: "注文明細保存エラー",
			repo: &orderRepositoryMock{
				createOrderFn: func(order *models.Order) error { return nil },
				findMenuByIDFn: func(id uint) (*models.Menu, error) {
					return &models.Menu{ID: id, Price: 200, IsAvailable: true}, nil
				},
				createOrderItemFn: func(item *models.OrderItem) error { return errors.New("item failed") },
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			usecase := NewOrderUsecase(tt.repo)
			got, err := usecase.CreateOrder([]CreateOrderItemInput{{MenuID: 1, Quantity: 1}})
			if got != nil || err == nil {
				t.Errorf("order = %+v, error = %v; want nil, error", got, err)
			}
		})
	}
}

func TestGetOrders(t *testing.T) {
	want := []models.Order{{ID: 1, Status: "pending"}, {ID: 2, Status: "completed"}}
	repo := &orderRepositoryMock{
		findAllFn: func() ([]models.Order, error) { return want, nil },
	}
	usecase := NewOrderUsecase(repo)

	got, err := usecase.GetOrders()

	if err != nil {
		t.Fatalf("GetOrders() error = %v", err)
	}
	if len(got) != 2 || got[0].ID != 1 || got[1].Status != "completed" {
		t.Errorf("GetOrders() = %+v", got)
	}
}

func TestGetOrdersReturnsRepositoryError(t *testing.T) {
	wantErr := errors.New("find all failed")
	repo := &orderRepositoryMock{
		findAllFn: func() ([]models.Order, error) { return nil, wantErr },
	}
	usecase := NewOrderUsecase(repo)

	got, err := usecase.GetOrders()

	if got != nil || !errors.Is(err, wantErr) {
		t.Errorf("orders = %+v, error = %v", got, err)
	}
}

func TestUpdateOrderStatus(t *testing.T) {
	findCount := 0
	var saved models.Order
	repo := &orderRepositoryMock{
		findByIDFn: func(id uint) (*models.Order, error) {
			findCount++
			if findCount == 1 {
				return &models.Order{ID: id, Status: "pending"}, nil
			}
			return &models.Order{ID: id, Status: "ready"}, nil
		},
		saveFn: func(order *models.Order) error {
			saved = *order
			return nil
		},
	}
	usecase := NewOrderUsecase(repo)

	got, err := usecase.UpdateOrderStatus(1, "ready")

	if err != nil {
		t.Fatalf("UpdateOrderStatus() error = %v", err)
	}
	if saved.ID != 1 || saved.Status != "ready" {
		t.Errorf("saved order = %+v", saved)
	}
	if got.ID != 1 || got.Status != "ready" || findCount != 2 {
		t.Errorf("order = %+v, FindByID calls = %d", got, findCount)
	}
}

func TestUpdateOrderStatusReturnsRepositoryError(t *testing.T) {
	wantErr := errors.New("find failed")
	repo := &orderRepositoryMock{
		findByIDFn: func(id uint) (*models.Order, error) { return nil, wantErr },
	}
	usecase := NewOrderUsecase(repo)

	got, err := usecase.UpdateOrderStatus(1, "ready")

	if got != nil || !errors.Is(err, wantErr) {
		t.Errorf("order = %+v, error = %v", got, err)
	}
}

func TestUpdateOrderStatusWriteFailures(t *testing.T) {
	dbErr := errors.New("database failed")
	for _, tt := range []struct {
		name      string
		failSave  bool
		wantReads int
	}{
		{"保存失敗時は再取得しない", true, 1},
		{"保存後の再取得失敗", false, 2},
	} {
		t.Run(tt.name, func(t *testing.T) {
			reads, writes := 0, 0
			repo := &orderRepositoryMock{
				findByIDFn: func(id uint) (*models.Order, error) {
					reads++
					if reads == 2 {
						return nil, dbErr
					}
					return &models.Order{ID: id, Status: "pending"}, nil
				},
				saveFn: func(o *models.Order) error {
					writes++
					if o.ID != 7 || o.Status != "ready" {
						t.Errorf("saved = %+v", o)
					}
					if tt.failSave {
						return dbErr
					}
					return nil
				},
			}
			got, err := NewOrderUsecase(repo).UpdateOrderStatus(7, "ready")
			if got != nil || !errors.Is(err, dbErr) {
				t.Errorf("got = %+v, error = %v", got, err)
			}
			if reads != tt.wantReads || writes != 1 {
				t.Errorf("reads = %d, writes = %d", reads, writes)
			}
		})
	}
}
