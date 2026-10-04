# ルートのアクセス制御: フロント・バックエンド接続仕様

この文書は今回のフロント実装が要求するAPI契約です。バックエンドは未変更です。
既存の `{ token: JWT }` を返すログインAPIだけでは、このフロントのログインは完了しません。
以下のCookie設定・API・検証をバックエンド担当者が実装した後に接続確認してください。

## 認証と認可の対象

- 認証: サーバーがJWTの署名・有効期限・発行元・対象者を検証し、現在のユーザーを確定する。
- 今回の認可対象はルーティング。ログイン済みユーザーなら `/staff` と `/monitor` にアクセスできる。スタッフ操作ごとの権限・roleはフロントで判定しない。
- `/`、`/login`、`/about` は公開。顧客用 `X-Order-Session` とログインのJWTは別物。
- 両保護ルートの `beforeLoad` で `/me` を呼び、成功するまでページとloaderを実行しない。401なら `/login` へ移動し、ログイン後に元のルートへ戻す。戻り先は `/staff` と `/monitor` のみ許可する。
- CookieをブラウザからAPIへ送る構成なので、両保護ルートは `ssr: false`。サーバーでは保護ページを描画せず、クライアントで認証確認してから表示する。
- ルート制限だけではAPIへの直接リクエストを防げない。APIの認証・操作の認可はバックエンドの責務として別途設計・実装する。

## API仕様

ベースURLは既存の `VITE_API_BASE_URL`（末尾 `/api`）。以下はその配下。
認証系レスポンスはすべて `Cache-Control: no-store` とする。

| メソッド・パス | リクエスト | 成功レスポンス |
| --- | --- | --- |
| GET `/csrf-token` | Cookie付き、ログイン前も利用可能 | `200 { "csrfToken": "ランダムな検証トークン" }` |
| POST `/login` | Cookie + `X-CSRF-Token` + JSON `{ "userName": "staff", "password": "..." }` | `204` または `200`、JWT CookieをSet-Cookie。本文はフロントで使用しない |
| GET `/me` | JWT Cookie | `200 { "user": { "id": "1", "username": "staff" } }` |
| POST `/logout` | JWT Cookie + `X-CSRF-Token` | `204`、サーバーでCookie削除・セッション失効 |

`user.id` と `user.username` は文字列。`role` は不要で、返されてもアクセス判断には使用しない。
不正な `/me` レスポンスや通信失敗でスタッフ画面を表示するフォールバックは設けていない。
ログイン成功後に `/me` を呼び、Cookieが実際にブラウザへ保存され利用可能か確認する。
JWTをレスポンスJSONに含める必要はない。JavaScriptはJWTを読み取り・保存・復号・署名検証しない。

### ステータスとエラー形式

```json
{ "code": "UNAUTHENTICATED", "error": "authentication required" }
```

| ステータス・code | 意味 | フロントの動作 |
| --- | --- | --- |
| 401 `INVALID_CREDENTIALS` | ログイン情報不一致 | ログイン画面でエラー表示 |
| 401 `UNAUTHENTICATED` | Cookieなし・期限切れ・失効 | 管理画面を閉じ、元の画面を指定してログインへ |
| 403 `FORBIDDEN` | サーバーがリクエストを拒否 | 操作のエラーを表示。操作APIの403だけではページから退出しない。`/me` の失敗時はページを表示せず確認エラーを表示 |
| 403 `CSRF_INVALID` | CSRFトークンなし・不一致・期限切れ | 自動再送せず、ユーザーに再操作を案内 |
| 429 | ログイン試行回数の制限 | 時間を置いて再試行する案内 |
| 5xx / ネットワーク失敗 | サーバー・接続の問題 | エラー表示。認証確認は再試行可能 |

認証APIはHTMLや302リダイレクトではなく上記ステータスを返す。フロントの認証fetchは `redirect: "error"`。
CSRF失敗は必ず `code: "CSRF_INVALID"` として権限不足と区別する。
エラー時は副作用を実行しない。更新リクエストはフロントから自動再送しない。

## CSRF対策（サーバー側の実装が必須）

方式: セッションに紐づけた synchronizer token。

1. ログイン前に `/csrf-token` で匿名の事前セッションCookieとCSRFトークンを発行する。
2. CookieはHttpOnlyで持ち、対応するランダムなCSRFトークンをサーバー側セッションに保持する。CSRFトークンのみJSONでフロントへ返す。
3. フロントは更新直前に `/csrf-token` をCookie付きで呼び、受け取った値を `X-CSRF-Token` ヘッダーへ付与する。
4. ログインを含む保護対象のPOST/PUT/PATCH/DELETEで、セッションに紐づく値とヘッダーを照合する。JWTの検証だけではCSRF対策にならない。
5. ログイン成功時は事前セッションを破棄し、認証済みセッション・CSRFトークンを新規発行してセッション固定を防ぐ。
6. 認証済みCSRFトークンはJWTの `jti` または同等のサーバー管理セッションIDと紐づける。
7. `/csrf-token` のGETごとに有効トークンをローテーションしない。同一セッションでは安定した値を返し、複数タブ・並行操作を壊さない。ログイン前の複数タブ競合が起きた場合はCSRF_INVALIDで拒否し再操作させる。
8. 全対象操作でOriginを許可リストと照合する。必要なRefererフォールバックやOriginなしの扱いはブラウザ/APIクライアントの運用方針と合わせて明示する。
9. CORSを攻撃者のOriginへ開放しない。トークンをURL、ログ、永続ブラウザストレージに保存しない。

フロントはCSRFトークンを各リクエスト内でのみ保持する。JWTにもCSRFにもlocalStorage/sessionStorageを使用しない。
顧客用 `order_session` は既存仕様のままsessionStorageに保持する。スタッフJWTと混同しない。
HttpOnlyはJWTのJavaScriptからの読み取りを防ぐが、XSSによる代理操作やCSRFを単独で防ぐものではない。

## JWT Cookie・有効期限・ログアウト

本番の推奨例（同一サイトの構成）:

```http
Set-Cookie: __Host-staff_session=<JWT>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900
```

- `__Host-`を使用するならSecure・Path=/・Domain指定なしが必須。APIホスト限定Cookieにする。
- JWTはサーバーで署名方式を固定し、署名・exp・iss・aud・subなどを検証する。秘密鍵はフロントに配布しない。
- 上記15分は推奨例でありフロントには固定していない。今回はリフレッシュトークン・自動延長APIを実装していない。期限切れは再ログイン。
- ログアウト時は同じ名前・Path・Domain条件でMax-Age=0を返し、サーバー側セッション/jtiも失効させる。Cookie削除だけでは流出済みJWTの有効性は失われない。
- ログアウトに失敗したときは「完了」と表示しない。HttpOnly CookieをJavaScriptから削除する処理はない。
- ユーザーの削除・権限変更の反映方針を決める。即時反映が必要ならセッション状態/失効情報を各保護APIで確認する。
- localStorageの旧 `token` キーはログイン時と管理画面確認時に削除する。

## 本番ドメイン・CORS

現在READMEにはCloudflareフロントとRailway APIの別サイト構成が記載されている。
別サイト間のCookieは、`credentials: "include"` だけでは動かない。

推奨は同一オリジンで `/api` をプロキシするか、`app.example.com` と `api.example.com` のようなHTTPSの同一サイトに配置すること。
別オリジンでも同一サイトならLax Cookieを使えるが、CORS設定は必要。
同一オリジンプロキシを選ぶ場合、現状のフロントにはそのプロキシ実装がないので別途構築が必要。
異なるサイトを維持するなら `SameSite=None; Secure` が必要で、さらにブラウザの第三者Cookie制限で動かない場合がある。全利用ブラウザでの実機検証が必須。

APIのCORS設定:

```http
Access-Control-Allow-Origin: https://フロントの正確なオリジン
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, X-Order-Session
Vary: Origin
```

資格情報付き通信ではAllow-Originに `*` を使わない。OPTIONSはログインやCSRF検証を要求せずCORSとして処理する。
`Set-Cookie` をExpose-Headersへ追加してもJSでは読み取れず、追加不要。
ローカルHTTP開発はSecure/`__Host-`を使えない環境があるため、開発専用の通常名CookieとSecure=falseを使うかローカルHTTPSにする。本番設定とは分ける。
localhostと127.0.0.1を混在させず、LAN利用時もフロント/APIのホスト名をそろえる。

## フロントから送信する認証・CSRF情報

以下は通信設定であり、スタッフ操作の許可判定ではない。各APIのアクセス方針はバックエンド側で決定する。

| API | Cookie送信 | CSRFヘッダー |
| --- | --- | --- |
| POST `/menus` | include | 必須 |
| PUT `/menus/:id` | include | 必須 |
| DELETE `/menus/:id` | include | 必須 |
| PUT `/orders/:id/status` | include | 必須 |
| GET `/order-access/qr` | include | 不要（読取） |
| GET `/me` | 必須 | 不要（読取） |
| POST `/login` | 不要（事前セッション） | 必須 |
| POST `/logout` | 必須 | 必須 |
| GET `/csrf-token` | ログイン前・後どちらも対応 | 不要（読取） |
| GET `/menus`, GET `/orders` | 今回は既存の公開APIを維持 | 不要 |
| POST `/orders` | スタッフJWTは使わず既存のX-Order-Sessionを検証 | 今回は既存方式を維持 |
| POST `/order-access/session` | スタッフJWTは使わずQRトークンを検証 | 今回は既存方式を維持 |

公開のGET `/orders`は現状、全注文内容を返す。個別注文の閲覧認可や番号・状態だけの公開APIへの分割は今回のフロント変更に含まれない。
同一オリジンでは公開fetchにもブラウザがCookieを付ける場合があるが、公開/顧客APIではスタッフCookieを注文認可の代用にしない。

## 結合確認

- ログイン前にCSRFを取得し、CookieとX-CSRF-Tokenを同時に送信できる。
- ログイン応答にJWTがなくても、Set-Cookieと `/me` によりスタッフ画面へ進める。
- リロード後も `/me` で認証を確認できる。JWTはdocument.cookieやlocalStorageに現れない。
- 直接URLを開く場合と画面内リンクで移動する場合の両方で、未認証401はログインへ。ログイン後は元のページへ戻る。
- 有効な `/me` ならroleなし・未知のroleでも保護ページを開ける。接続失敗・不正な応答では表示せず再試行できる。
- APIへの直接アクセスにも、バックエンドで決めた認証・認可方針が適用される。
- ログイン・更新・削除・ログアウトのCSRF欠落、不正値、別セッションの値をサーバーで拒否する。
- 悪意あるOriginのフォーム送信やfetchから状態変更できない。
- Cookie削除/失効/期限切れ後、保護APIは401。ネットワーク失敗だけでログアウト成功扱いにしない。
- 顧客のQR注文はスタッフログインなしで従来どおり行える。
- 実際の本番ドメインとブラウザでCookie/CORS/第三者Cookie制限を検証する。

参考: [OWASP CSRF対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)、[MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)、[MDN 第三者Cookie](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies)。

ルート実装: [TanStack Router認証ガイド](https://tanstack.com/router/latest/docs/guide/authenticated-routes)、[TanStack Start Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)。
