import { getApiBase } from './base'

type LoginRequest = {
  username: string
  password: string
}

type LoginResponse = {
  token: string
}

export async function createSession(
  data: LoginRequest,
): Promise<LoginResponse> {
  const response = await fetch(`${getApiBase()}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userName: data.username,
      password: data.password,
    }),
  })

  if (!response.ok) {
    throw new Error('ログインに失敗しました')
  }

  return response.json()
}