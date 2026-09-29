package order

type CreateOrderDTO struct {
	Items []CreateOrderItemDTO `json:"items"`
}

type CreateOrderItemDTO struct {
	MenuID   uint `json:"menu_id"`
	Quantity int  `json:"quantity"`
}

type UpdateOrderStatusDTO struct {
	Status string `json:"status"`
}
