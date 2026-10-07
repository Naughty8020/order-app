package menu

import (
	"errors"
	"testing"

	"order-system/domain/repository"
	"order-system/models"
)

type menuRepositoryMock struct {
	createFn   func(menu *models.Menu) error
	findAllFn  func() ([]models.Menu, error)
	findByIDFn func(id uint) (*models.Menu, error)
	saveFn     func(menu *models.Menu) error
	deleteFn   func(menu *models.Menu) error
}

func (m *menuRepositoryMock) Create(menu *models.Menu) error {
	return m.createFn(menu)
}

func (m *menuRepositoryMock) FindAll() ([]models.Menu, error) {
	return m.findAllFn()
}

func (m *menuRepositoryMock) FindByID(id uint) (*models.Menu, error) {
	return m.findByIDFn(id)
}

func (m *menuRepositoryMock) Save(menu *models.Menu) error {
	return m.saveFn(menu)
}

func (m *menuRepositoryMock) Delete(menu *models.Menu) error {
	return m.deleteFn(menu)
}

func TestCreateMenu(t *testing.T) {
	repo := &menuRepositoryMock{
		createFn: func(menu *models.Menu) error {
			menu.ID = 1
			return nil
		},
	}
	usecase := NewMenuUsecase(repo)

	got, err := usecase.CreateMenu(CreateMenuInput{
		Name:        "レモネード",
		Price:       300,
		IsAvailable: true,
	})

	if err != nil {
		t.Fatalf("CreateMenu() error = %v", err)
	}
	if got.ID != 1 || got.Name != "レモネード" || got.Price != 300 || !got.IsAvailable {
		t.Errorf("CreateMenu() = %+v", got)
	}
}

func TestCreateMenuReturnsRepositoryError(t *testing.T) {
	wantErr := errors.New("create failed")
	repo := &menuRepositoryMock{
		createFn: func(menu *models.Menu) error { return wantErr },
	}
	usecase := NewMenuUsecase(repo)

	got, err := usecase.CreateMenu(CreateMenuInput{Name: "コーラ", Price: 200})

	if got != nil {
		t.Errorf("CreateMenu() menu = %+v, want nil", got)
	}
	if !errors.Is(err, wantErr) {
		t.Errorf("CreateMenu() error = %v, want %v", err, wantErr)
	}
}

func TestGetMenus(t *testing.T) {
	want := []models.Menu{{ID: 1, Name: "コーラ", Price: 200}}
	repo := &menuRepositoryMock{
		findAllFn: func() ([]models.Menu, error) { return want, nil },
	}
	usecase := NewMenuUsecase(repo)

	got, err := usecase.GetMenus()

	if err != nil {
		t.Fatalf("GetMenus() error = %v", err)
	}
	if len(got) != 1 || got[0].Name != want[0].Name {
		t.Errorf("GetMenus() = %+v, want %+v", got, want)
	}
}

func TestUpdateMenuUpdatesOnlySpecifiedFields(t *testing.T) {
	original := &models.Menu{ID: 1, Name: "コーラ", Price: 200, IsAvailable: true}
	var saved *models.Menu
	repo := &menuRepositoryMock{
		findByIDFn: func(id uint) (*models.Menu, error) {
			if id != 1 {
				t.Fatalf("FindByID() id = %d, want 1", id)
			}
			return original, nil
		},
		saveFn: func(menu *models.Menu) error {
			saved = menu
			return nil
		},
	}
	usecase := NewMenuUsecase(repo)
	newPrice := 250
	isAvailable := false

	got, err := usecase.UpdateMenu(1, UpdateMenuInput{
		Price:       &newPrice,
		IsAvailable: &isAvailable,
	})

	if err != nil {
		t.Fatalf("UpdateMenu() error = %v", err)
	}
	if saved == nil {
		t.Fatal("Save() was not called")
	}
	if got.Name != "コーラ" || got.Price != 250 || got.IsAvailable {
		t.Errorf("UpdateMenu() = %+v", got)
	}
}

func TestUpdateMenuReturnsNotFound(t *testing.T) {
	repo := &menuRepositoryMock{
		findByIDFn: func(id uint) (*models.Menu, error) {
			return nil, repository.ErrMenuNotFound
		},
	}
	usecase := NewMenuUsecase(repo)

	got, err := usecase.UpdateMenu(99, UpdateMenuInput{})

	if got != nil {
		t.Errorf("UpdateMenu() menu = %+v, want nil", got)
	}
	if !errors.Is(err, ErrMenuNotFound) {
		t.Errorf("UpdateMenu() error = %v, want %v", err, ErrMenuNotFound)
	}
}

func TestDeleteMenu(t *testing.T) {
	wantMenu := &models.Menu{ID: 1, Name: "コーラ"}
	var deleted *models.Menu
	repo := &menuRepositoryMock{
		findByIDFn: func(id uint) (*models.Menu, error) { return wantMenu, nil },
		deleteFn: func(menu *models.Menu) error {
			deleted = menu
			return nil
		},
	}
	usecase := NewMenuUsecase(repo)

	err := usecase.DeleteMenu(1)

	if err != nil {
		t.Fatalf("DeleteMenu() error = %v", err)
	}
	if deleted != wantMenu {
		t.Errorf("Delete() menu = %+v, want %+v", deleted, wantMenu)
	}
}

func TestDeleteMenuReturnsNotFound(t *testing.T) {
	repo := &menuRepositoryMock{
		findByIDFn: func(id uint) (*models.Menu, error) {
			return nil, repository.ErrMenuNotFound
		},
	}
	usecase := NewMenuUsecase(repo)

	err := usecase.DeleteMenu(99)

	if !errors.Is(err, ErrMenuNotFound) {
		t.Errorf("DeleteMenu() error = %v, want %v", err, ErrMenuNotFound)
	}
}

func TestMenuPromotions(t *testing.T) {
	stored := &models.Menu{ID: 1, Name: "コーラ", Price: 200, IsAvailable: true}
	repo := &menuRepositoryMock{
		createFn:   func(menu *models.Menu) error { *stored = *menu; return nil },
		findByIDFn: func(id uint) (*models.Menu, error) { return stored, nil },
		saveFn:     func(menu *models.Menu) error { return nil },
	}
	uc := NewMenuUsecase(repo)
	if _, err := uc.CreateMenu(CreateMenuInput{Name: "コーラ", Price: 200, IsAvailable: true, IsRecommended: true, IsFeatured: true}); err != nil {
		t.Fatal(err)
	}
	if !stored.IsRecommended || !stored.IsFeatured {
		t.Fatalf("promotions not created: %+v", stored)
	}
	off := false
	got, err := uc.UpdateMenu(1, UpdateMenuInput{IsRecommended: &off})
	if err != nil {
		t.Fatal(err)
	}
	if got.IsRecommended || !got.IsFeatured || !got.IsAvailable || got.Name != "コーラ" {
		t.Fatalf("partial update changed other fields: %+v", got)
	}
	got, err = uc.UpdateMenu(1, UpdateMenuInput{IsFeatured: &off})
	if err != nil {
		t.Fatal(err)
	}
	if got.IsFeatured {
		t.Fatal("featured was not disabled")
	}
	on := true
	got, err = uc.UpdateMenu(1, UpdateMenuInput{IsRecommended: &on})
	if err != nil {
		t.Fatal(err)
	}
	if !got.IsRecommended || got.IsFeatured {
		t.Fatalf("independent enable failed: %+v", got)
	}
}
