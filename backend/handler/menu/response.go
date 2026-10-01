package menu

import "order-system/models"

type CreateMenuResponse struct {
	Data models.Menu `json:"data"`
}

type GetMenusResponse struct {
	Data []models.Menu `json:"data"`
}

type UpdateMenuResponse struct {
	Data models.Menu `json:"data"`
}

type DeleteMenuResponse struct {
	Message string `json:"message"`
}
