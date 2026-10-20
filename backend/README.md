todo

オーダーのセキュリティ
売上の換算
割引できるような機能

## 管理者の初期登録

`backend/.env` に次の環境変数を設定して `docker compose up --build` を実行すると、
起動時にログイン用の管理者ユーザーを作成します。

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
JWT_SECRET=
```

パスワードはbcryptでハッシュ化して保存します。同名ユーザーが存在する場合は
作成・パスワード更新を行いません。両方の `ADMIN_*` が未設定なら登録をスキップし、
片方だけ設定されている場合はエラーで起動を中止します。
`JWT_SECRET` はHS256でのトークン署名・検証に使用します。未設定または32バイト未満の
場合は、DB初期化前にエラーで起動を中止します。次のコマンドで暗号学的にランダムな
32バイト（256ビット）の値を生成し、出力される64文字の16進文字列をそのまま
`backend/.env` の `JWT_SECRET=` に設定してください（コマンド自体は記載しません）。

```bash
openssl rand -hex 32
```

長さの検査だけではランダム性を保証できません。人が考えた文字列や繰り返し文字列を
使わず、環境ごとに生成してください。鍵をGitやログに記録しないでください。
鍵を変更すると既存のJWTは無効になり、再ログインが必要です。
Goを直接実行する場合は、これらをプロセスの環境変数として設定してください。

## 注文用QRコード

起動前に次の環境変数を設定します。

- `ORDER_ACCESS_SECRET`: QRコードへ署名する長いランダム文字列
- `FRONTEND_ORIGINS`: 許可するフロントエンドURL（カンマ区切り）

スマートフォンからLAN内のフロントエンドを開く場合は、例えば
`FRONTEND_ORIGINS=http://192.168.1.10:3000` のように実際のURLを指定します。

1. フロントエンドを開くとQRコードが自動発行される
2. 客がQRコードを読み取る
3. フロントエンドが10分有効のQRトークンを注文セッションへ交換する
4. 注文時に `X-Order-Session` Headerを送信する

注文セッションは30分有効で、1セッションにつき10分間に3注文までです。
QRコードは10分ごとに自動更新されます。

## テスト

`backend` ディレクトリで実行します。単体テストはDB・Dockerなしで動作します。

```bash
go test ./...
```

DB層にも `*_unit_test.go` の単体テストがあります。`go-sqlmock` でDBからの
戻り値やエラーを再現し、SQLの検索条件・引数、結果の変換、関連データの取得、
エラーの返却、書き込み時のコミット・ロールバックを確認します。
これらは通常の `go test ./...` に含まれ、MySQLへの接続は行いません。

```bash
# DB層の単体テストだけ実行（Docker不要）
go test ./infra/db/... -cover

# 全単体テストとカバレッジ計測
go test ./... -cover
```
## おすすめ・イチオシ表示

スタッフ画面の「メニュー在庫コントロール」で、商品ごとに「おすすめ」と「イチオシ」を個別にON/OFFできます。両方の同時設定も可能です。イチオシ商品のカート追加ボタンは光る表示になり、売り切れ時は追加できません。開いている注文画面には通常4秒程度で反映されます。

メニューAPIの `is_recommended` と `is_featured` に設定を保存します。更新時に省略した項目は変更しません。既存メニューは両方OFFで、バックエンド起動時のAutoMigrateで列を追加します。バックエンドを先に更新してからフロントエンドを公開してください。

## お客様の注文履歴

新規注文時に注文ごとのランダムな閲覧用トークンを返し、フロントエンドは
`localStorage` に注文番号・トークン・有効期限だけを保存します。DBにはトークンの
SHA-256ハッシュを保存し、生トークンは保存しません。閲覧期限は注文から24時間で、
30分の注文セッションとは独立しています。再読み込み・QR再読込後も同じブラウザーなら
商品名・数量・注文時の金額・最新状況・受け取り済み履歴を確認できます。

- `GET /api/orders`: 管理者JWT必須。スタッフ用の全注文。
- `GET /api/orders/public`: 公開モニター用。準備中・呼び出し中の番号と状況のみ。
- `GET /api/orders/:id/receipt`: `X-Order-Receipt` ヘッダー必須。その注文の明細のみ。
  鍵の不一致・未指定・期限切れ・存在しない注文は410。応答はキャッシュ禁止です。

ブラウザー保存領域の消去・別端末への移動では履歴を復元できません。保存に失敗した場合は
注文番号を控える案内を表示します。通信失敗や404では鍵を保持し、無効・期限切れを示す410でのみ削除します。
導入前の注文には閲覧用トークンがないため、お客様の履歴には復元されません。

起動時のAutoMigrateで`orders.receipt_token_hash`、`orders.receipt_expires_at`、
`order_items.name`を追加します。商品名は注文時点の値を保存します。
APIの公開範囲が変わるため、バックエンドとフロントエンドを同じリリースで更新してください。

## 注文状態

注文状態は `pending`（準備中）、`ready`（呼び出し中）、`completed`（受け渡し完了）の3種類です。新規注文は `pending` で作成し、スタッフ画面から `ready`、`completed` に更新します。状態更新APIは `preparing` を含む上記以外の値をHTTP 400で拒否し、`completed` になった注文を別の状態へ戻す操作をHTTP 409で拒否します。

## 結合テスト・E2Eテスト

単体テストは従来どおり `go test ./...` で実行できます。以下は別途MySQLが必要です。

- 結合テスト: `server/routers_integration_test.go`。実際のルーティング・認証・handler・usecase・repository・MySQLを接続し、ログイン、メニュー操作、注文と明細の保存、ステータス変更、回数制限、拒否時のDB状態を確認します。
- E2Eテスト: `frontend/e2e/ordering.e2e.ts`。Chromiumでスタッフと顧客を操作し、QRリンクから注文・呼び出し・提供完了まで確認します。APIのモックは使いません。QR画像自体のカメラ読み取りは対象外です。

まず `backend` でテスト専用MySQLを起動します。開発用DBとは別のコンテナです。

```bash
docker compose -p order-app-tests -f docker-compose.test.yml up -d --wait
export TEST_MYSQL_DSN='root:test-only-password@tcp(127.0.0.1:13306)/?parseTime=true'

# 単体＋結合テスト
go test -tags=integration ./... -count=1

# 結合テストだけ
go test -tags=integration ./server -run '^TestIntegration' -v

# E2E（同じターミナルで実行）
cd ../frontend
bun install --frozen-lockfile
bunx playwright install chromium
bun run test:e2e

# 失敗時のレポート表示
bunx playwright show-report
```

E2Eは専用API（127.0.0.1:18080）とVite（127.0.0.1:13000）を自動起動・終了します。
既存サーバーは再利用しません。ログイン情報はテスト専用の `e2e-admin` / `e2e-password` です。
テストAPIは `integration` ビルドタグ付きでのみビルドされ、本番APIにテスト用エンドポイントを追加しません。
ブラウザの失敗時は `frontend/test-results/` にスクリーンショットとトレースを保存します。

結合テストの各ケースとE2E実行ごとに、ランダム名 `order_app_test_*` のDBを新規作成し、
終了時にそのDBだけを削除します。DSNに指定された既存DBは変更しません。
DB作成・削除権限が必要なので、上記の専用MySQLを使用してください。
`TEST_MYSQL_DSN` が未設定なら、結合・E2Eテストはスキップせず失敗します。

実行後はテスト用コンテナを削除します。一時データも消去されます。

```bash
cd ../backend
docker compose -p order-app-tests -f docker-compose.test.yml down
```

GitHub Actionsの `Integration and E2E` ワークフローでも、専用MySQLで両方を実行します。
