package menu

type CreateMenuDTO struct {
	Name        string `json:"name" binding:"required"`
	Price       int    `json:"price" binding:"required,gt=0"`
	IsAvailable bool   `json:"is_available"`
}

type UpdateMenuDTO struct {
	Name        *string `json:"name"`
	Price       *int    `json:"price" binding:"omitempty,gt=0"`
	IsAvailable *bool   `json:"is_available"`
}
