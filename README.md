# order-app (オーダーシステム)

オーダーシステムのアプリケーションです。Go言語で書かれたバックエンドと、React/TanStack Startで構築されたフロントエンドで構成されています。

## 構成スタック (Technology Stack)

### バックエンド (Backend)
- **言語**: Go 1.25.11
- **フレームワーク**: [Gin](https://gin-gonic.github.io/gin/)
- **ORM**: [GORM](https://gorm.io/)
- **データベース**: MySQL 8.0
- **開発ツール**: [Air](https://github.com/air-verse/air) (Goのライブリロードツール)
- **コンテナ**: Docker / Docker Compose

### フロントエンド (Frontend)
- **言語**: TypeScript 6
- **ライブラリ/フレームワーク**: [React 19](https://react.dev/), [TanStack Start](https://tanstack.com/start) / [TanStack Router](https://tanstack.com/router)
- **ビルドツール/開発サーバー**: [Vite 8](https://vite.dev/)
- **CSSフレームワーク**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Linter & Formatter**: [Biome 2.4.5](https://biomejs.dev/)
- **テスト**: [Vitest](https://vitest.dev/)
- **パッケージ管理**: [Bun](https://bun.sh/)
- **デプロイ**: [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare Workers/Pages向け)

---

## 起動方法

### バックエンドの起動

バックエンドは、Docker Composeを使用してDB（MySQL）とAPIサーバーをセットで起動するのが最も簡単です。

#### 1. Docker Composeを使用する場合
先に[バックエンドの設定手順](backend/README.md#管理者の初期登録)に従い、
ランダムな `JWT_SECRET` と管理者情報を設定してください。
`backend` ディレクトリへ移動し、Docker Compose コマンドを実行します。
```bash
cd backend
docker compose up --build
```
- APIサーバーは、ライブリロードツール `Air` を使用して `http://localhost:8080` で起動します。
- DB（MySQL 8.0）はポート `3306` でバックグラウンドで起動し、ヘルスチェックが通るまでAPIサーバーの起動を待機します。

<!-- #### 2. ローカル環境で直接実行する場合（MySQLは別途起動済みとする）
```bash
cd backend
# DB接続情報などの環境変数を設定した上で実行します
# 開発時（ライブリロードあり）
air -c .air.toml
# または直接実行する場合
go run main.go
``` -->

### フロントエンドの起動

フロントエンドはパッケージマネージャーとして **Bun** を使用します。

```bash
cd frontend
# 依存関係のインストール
bun install

# 開発サーバーの起動 (ポート 3000番)
bun run dev
# または
bun --bun run dev
```
起動後、ブラウザで `http://localhost:3000` にアクセスできます。

---

## その他の開発コマンド

### フロントエンド関連

- **プロダクション用ビルド**
  ```bash
  cd frontend
  bun run build
  ```
- **Linter & Formatterの実行 (Biome)**
  ```bash
  cd frontend
  bun run lint     # Lintチェック
  bun run format   # フォーマット適用
  bun run check    # Lint/Format/Import整理をまとめてチェック
  ```
- **テストの実行 (Vitest)**
  ```bash
  cd frontend
  bun run test
  ```
- **Cloudflareへのデプロイ**
  ```bash
  cd frontend
  bun run deploy
  ```
