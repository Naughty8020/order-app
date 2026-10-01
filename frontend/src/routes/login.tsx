import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { createSession } from '../api/login'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await createSession({
        username,
        password,
      })

      console.log('ログイン成功', data)
    } catch (error) {
      console.error(error)
      setError('ユーザーネームまたはパスワードが違います')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>ログイン</h1>

      <div>
        <label>ユーザーネーム</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ユーザーネームを入力"
        />
      </div>

      <div>
        <label>パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワードを入力"
        />
      </div>

      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>

      {error && <p>{error}</p>}
    </div>
  )
}