package menu

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"order-system/models"
	menuUsecase "order-system/usecase/menu"

	"github.com/gin-gonic/gin"
)

type menuUsecaseMock struct {
	createMenuFn func(input menuUsecase.CreateMenuInput) (*models.Menu, error)
	getMenusFn   func() ([]models.Menu, error)
	updateMenuFn func(id uint, input menuUsecase.UpdateMenuInput) (*models.Menu, error)
	deleteMenuFn func(id uint) error
}

func (m *menuUsecaseMock) CreateMenu(input menuUsecase.CreateMenuInput) (*models.Menu, error) {
	return m.createMenuFn(input)
}

func (m *menuUsecaseMock) GetMenus() ([]models.Menu, error) {
	return m.getMenusFn()
}

func (m *menuUsecaseMock) UpdateMenu(id uint, input menuUsecase.UpdateMenuInput) (*models.Menu, error) {
	return m.updateMenuFn(id, input)
}

func (m *menuUsecaseMock) DeleteMenu(id uint) error {
	return m.deleteMenuFn(id)
}

func TestCreateMenuHandler(t *testing.T) {
	usecase := &menuUsecaseMock{
		createMenuFn: func(input menuUsecase.CreateMenuInput) (*models.Menu, error) {
			if input.Name != "レモネード" || input.Price != 300 || !input.IsAvailable {
				t.Errorf("CreateMenu() input = %+v", input)
			}
			return &models.Menu{ID: 1, Name: input.Name, Price: input.Price, IsAvailable: input.IsAvailable}, nil
		},
	}
	recorder := performRequest(
		NewMenuHandler(usecase),
		http.MethodPost,
		"/api/menus",
		`{"name":"レモネード","price":300,"is_available":true}`,
	)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d; body = %s", recorder.Code, http.StatusCreated, recorder.Body.String())
	}
	var response CreateMenuResponse
	decodeResponse(t, recorder, &response)
	if response.Data.ID != 1 || response.Data.Name != "レモネード" {
		t.Errorf("response = %+v", response)
	}
}

func TestCreateMenuHandlerRejectsInvalidBody(t *testing.T) {
	usecase := &menuUsecaseMock{
		createMenuFn: func(input menuUsecase.CreateMenuInput) (*models.Menu, error) {
			t.Fatal("CreateMenu() should not be called")
			return nil, nil
		},
	}
	recorder := performRequest(NewMenuHandler(usecase), http.MethodPost, "/api/menus", `{"name":"","price":0}`)

	if recorder.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestGetMenusHandler(t *testing.T) {
	usecase := &menuUsecaseMock{
		getMenusFn: func() ([]models.Menu, error) {
			return []models.Menu{{ID: 1, Name: "コーラ", Price: 200}}, nil
		},
	}
	recorder := performRequest(NewMenuHandler(usecase), http.MethodGet, "/api/menus", "")

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	var response GetMenusResponse
	decodeResponse(t, recorder, &response)
	if len(response.Data) != 1 || response.Data[0].Name != "コーラ" {
		t.Errorf("response = %+v", response)
	}
}

func TestUpdateMenuHandlerPartiallyUpdatesMenu(t *testing.T) {
	usecase := &menuUsecaseMock{
		updateMenuFn: func(id uint, input menuUsecase.UpdateMenuInput) (*models.Menu, error) {
			if id != 1 {
				t.Errorf("UpdateMenu() id = %d, want 1", id)
			}
			if input.Price == nil || *input.Price != 250 {
				t.Errorf("UpdateMenu() price = %v, want 250", input.Price)
			}
			if input.Name != nil {
				t.Errorf("UpdateMenu() name = %v, want nil", input.Name)
			}
			if input.IsAvailable != nil {
				t.Errorf("UpdateMenu() isAvailable = %v, want nil", input.IsAvailable)
			}

			return &models.Menu{
				ID:          id,
				Name:        "コーラ",
				Price:       *input.Price,
				IsAvailable: true,
			}, nil
		},
	}
	recorder := performRequest(NewMenuHandler(usecase), http.MethodPut, "/api/menus/1", `{"price":250}`)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response UpdateMenuResponse
	decodeResponse(t, recorder, &response)
	if response.Data.ID != 1 || response.Data.Name != "コーラ" || response.Data.Price != 250 || !response.Data.IsAvailable {
		t.Errorf("response = %+v", response)
	}
}

func TestUpdateMenuHandlerReturnsNotFound(t *testing.T) {
	usecase := &menuUsecaseMock{
		updateMenuFn: func(id uint, input menuUsecase.UpdateMenuInput) (*models.Menu, error) {
			return nil, menuUsecase.ErrMenuNotFound
		},
	}
	recorder := performRequest(NewMenuHandler(usecase), http.MethodPut, "/api/menus/99", `{"price":250}`)

	if recorder.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d; body = %s", recorder.Code, http.StatusNotFound, recorder.Body.String())
	}
}

func TestUpdateMenuHandlerRejectsInvalidID(t *testing.T) {
	usecase := &menuUsecaseMock{
		updateMenuFn: func(id uint, input menuUsecase.UpdateMenuInput) (*models.Menu, error) {
			t.Fatal("UpdateMenu() should not be called")
			return nil, nil
		},
	}
	recorder := performRequest(NewMenuHandler(usecase), http.MethodPut, "/api/menus/abc", `{"price":250}`)

	if recorder.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestDeleteMenuHandler(t *testing.T) {
	usecase := &menuUsecaseMock{
		deleteMenuFn: func(id uint) error {
			if id != 1 {
				t.Errorf("DeleteMenu() id = %d, want 1", id)
			}
			return nil
		},
	}
	recorder := performRequest(NewMenuHandler(usecase), http.MethodDelete, "/api/menus/1", "")

	if recorder.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
}

func TestGetMenusHandlerReturnsInternalServerError(t *testing.T) {
	usecase := &menuUsecaseMock{
		getMenusFn: func() ([]models.Menu, error) { return nil, errors.New("database error") },
	}
	recorder := performRequest(NewMenuHandler(usecase), http.MethodGet, "/api/menus", "")

	if recorder.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusInternalServerError)
	}
}

func performRequest(handler Handler, method, path, body string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/menus", handler.CreateMenu)
	router.GET("/api/menus", handler.GetMenus)
	router.PUT("/api/menus/:id", handler.UpdateMenu)
	router.DELETE("/api/menus/:id", handler.DeleteMenu)

	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	return recorder
}

func decodeResponse(t *testing.T, recorder *httptest.ResponseRecorder, value any) {
	t.Helper()
	if err := json.Unmarshal(recorder.Body.Bytes(), value); err != nil {
		t.Fatalf("failed to decode response: %v; body = %s", err, recorder.Body.String())
	}
}

func TestUpdateMenuPromotionFields(t *testing.T) {
	uc := &menuUsecaseMock{updateMenuFn: func(id uint, input menuUsecase.UpdateMenuInput) (*models.Menu, error) {
		if input.IsRecommended == nil || *input.IsRecommended || input.IsFeatured == nil || !*input.IsFeatured || input.IsAvailable != nil {
			t.Fatalf("unexpected input: %+v", input)
		}
		return &models.Menu{ID: id, IsRecommended: *input.IsRecommended, IsFeatured: *input.IsFeatured}, nil
	}}
	response := performRequest(NewMenuHandler(uc), http.MethodPut, "/api/menus/1", `{"is_recommended":false,"is_featured":true}`)
	if response.Code != http.StatusOK {
		t.Fatalf("status: %d, body: %s", response.Code, response.Body.String())
	}
	var body UpdateMenuResponse
	decodeResponse(t, response, &body)
	if body.Data.IsRecommended || !body.Data.IsFeatured {
		t.Fatalf("unexpected response: %+v", body)
	}
}
