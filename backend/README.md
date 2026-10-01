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
JWT_SECRET=your-long-random-signing-secret
```

パスワードはbcryptでハッシュ化して保存します。同名ユーザーが存在する場合は
作成・パスワード更新を行いません。両方の `ADMIN_*` が未設定なら登録をスキップし、
片方だけ設定されている場合はエラーで起動を中止します。
`JWT_SECRET` はログイン時のトークン発行に必要です。
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
