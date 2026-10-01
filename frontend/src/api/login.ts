type LoginRequest = {
  username: string
  password: string
}

export async function createSession(data: LoginRequest) {
  const response = await fetch(
    'http://localhost:8080/api/order-access/session',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    },
  )

  if (!response.ok) {
    throw new Error('ログインに失敗しました')
  }

  return response.json()
}