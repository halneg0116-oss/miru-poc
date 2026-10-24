# miru. PoC v0.3

背景 → 完成構図 → 半透明ガイド → 撮影 → 保存を検証する端末内AIカメラ試作。PR #2 / Issue #4の検証ブランチです。公開mainへのマージは実機受け入れ完了後に判断します。

## 起動・自動テスト

依存パッケージのインストール・ビルド・APIキーは不要です。Node.js 20以降で `npm test`、Python 3でローカル配信できます。

```sh
npm test
python3 -m http.server 8766 --bind 127.0.0.1
```

Macで `http://localhost:8766/` を開きます。ES Modulesを使うためHTMLの直接ダブルクリックは不可。iPhoneからはMacのlocalhostには接続できません。LANのHTTP配信ではライブカメラの条件を満たさないため、下記の別HTTPS環境を利用します。

## 実装と責務

- `app.js`: 4画面の状態・撮影・保存。背景変更／撮影への移動時は保留中の解析結果を無効化し、遅い解析が撮影中のガイドを変更しないようにします。構図画像保存時は比率・プランを操作開始時に固定します。
- `scene-analyzer.js`: 背景全体を長辺640px以内に縮小し、MediaPipe Object Detector（CPU / IMAGE）で物体検出。12×12の局所テクスチャも計算。読み込み時間・推論時間・全体時間・失敗段階を記録。
- `detector-loader.js`: モデルの初期化を共有。失敗／20秒の非同期読み込みタイムアウト後は再試行可能。タイムアウト後に完成したモデルは解放します。同期WASM処理がメインスレッドを塞ぐ時間はタイマーで中断できません。
- `composition-engine.js`: 正規化された元画像座標から中央cover後の表示座標に変換。物体重なり・細部の多さ・基準位置からの距離で候補を評価。背景重視／全身は素材枠が画面内に入る候補だけを比較。寄りは意図的に下半身を切ります。
- `shot-planner.js` / `pose-library.js` / `presets.js`: 3構図と既存のポーズ素材。失敗時は固定テンプレートへ戻します。
- `debug-mode.js`: 明示的なURL指定時だけ診断を表示。
- `image.js`: 全領域を保持した背景取得と、選択比率で一度だけ切り抜くJPEG出力。座標変換テストではこのcover描画と構図計算を比較します。
- `camera.js`: 背面優先カメラと停止処理。写真選択・標準カメラの代替導線あり。

暖色UI、通常撮影へのスキップ、ガイドの切替、4:5・9:16・1:1、既存素材、撮影・保存フローを維持しています。人物位置は画面上の構図目安であり、実世界の安全な立ち位置を判定しません。構図スコアは学習済み美学モデルの品質点ではなく、候補選択用ヒューリスティックです。小さいコスト（大きい合計スコア）が優先され、異なる構図間の品質比較には使いません。

## 開発者デバッグ

URLの末尾に `?debug=1` を付けます。例：`http://localhost:8766/?debug=1`。既存のクエリがある場合は `&debug=1`。通常URLでは診断DOMを作りません。撮影・結果画面では非表示になり、写真にも入りません。アクセス制御機能ではありません。

構図選択画面の末尾で以下を確認できます。

- `status` / `source`: idle、loading、complete、error、cancelledとAI／固定構図の区別。
- `model`: 固定バージョン、JS・WASM・モデル取得先、CPU設定。
- `timings`: `modelLoadMs`（モデル取得と初期化待ち、キャッシュ時は短縮）、`inferenceMs`（detectのみ）、`totalMs`（画像処理含む）。単位ms。
- `objects`: ラベル、信頼度、元画像の正規化矩形と `frame`（選択比率の中央cover後の矩形）。画角外の座標は0〜1外になるため、隠れている物体と区別できます。
- `plans`: 各構図の人物中心x・高さ・下端余白（%）、ポーズ、合計スコアとclutter／collisions／center／clippingのコスト内訳。
- `error`: エラー名、メッセージ、失敗段階（image／model／inference）、失敗までの時間。データは端末の画面だけに表示し、自動送信・永続保存しません。

モデル失敗後は背景画面へ戻って再度確定すれば再試行できます。通信を切って初回ロードする場合も試してください。すでにモデルをキャッシュした場合、オフラインでも成功することがあります。

## iPhoneの保存

iPhone Safariの「写真アプリへ保存」で実画像の長押し用パネルを開きます。画像を長押しし、Safariの「写真に保存／写真に追加」を利用してください。Webアプリから写真アプリの保存完了は検出できません。共有ボタンも維持。iPhoneではJPEGダウンロードへ自動切替せず、iPhone以外では共有非対応時にダウンロードします。選択した比率で中央クロップした撮影写真には、ガイドを含めません。

## 本番mainを触らない別HTTPSプレビューの準備

既存 `halneg0116-oss/miru-poc` のPages設定・公開元・mainは変更しません。以下は**別の新規リポジトリ**での手動プレビューです。今回は公開操作そのものは行っていません。

1. GitHubでプレビュー専用の公開リポジトリ（例：`miru-poc-preview`）を作成します。ソースと同梱サンプルを公開してよい場合に利用します。既存本番リポジトリを選ばないでください。
2. 本PRのheadブランチを取得します。ダウンロードする場合はCode → ブランチ選択 `feature/miru-v03-scene-intelligence` → Download ZIP。CLIでは次のように別フォルダへcloneします。

   ```sh
   git clone --branch feature/miru-v03-scene-intelligence --single-branch https://github.com/halneg0116-oss/miru-poc.git miru-v03-preview-source
   cd miru-v03-preview-source
   git rev-parse HEAD
   npm test
   ```

3. プレビュー専用リポジトリのAdd file → Upload filesで、取得したアプリのルートファイルを配置します。`index.html`、`styles.css`、全ルート`.js`ファイル（`scene-analyzer.js`、`detector-loader.js`、`composition-engine.js`、`shot-planner.js`、`pose-library.js`、`debug-mode.js`を含む）と `assets/` をアップロード。`.git`、個人写真、撮影結果はアップロードしません。リポジトリ直下にindex.htmlがあることを確認します。ビルド不要です。
4. **プレビュー専用リポジトリだけ**のSettings → Pagesで、SourceをDeploy from a branch、作成したブランチ（通常main）と `/(root)` に設定します。ここで指定するmainは新規プレビューリポジトリのもので、本番リポジトリのmainではありません。
5. Actionsでデプロイ成功を確認し、Pagesに表示される `https://halneg0116-oss.github.io/miru-poc-preview/` 相当のURLをSafariで開きます。Enforce HTTPSを確認。独自ドメインは不要です。URLは例であり、実際には作成したリポジトリのURLを使います。
6. `?debug=1` を付けて、v0.3.0表示とモデル情報を確認。検証記録には手順2のSHA、iOS／Safariバージョン、端末名、背景種別、初回／2回目、3時間値、検出ラベル・推奨位置・エラーを残します。
7. PRを更新したら同じブランチから取得し直して専用リポジトリを更新します。Pagesの反映後、Safariを再読み込みしてコードの更新を確認します。本番へのマージやPagesの切替は実機受け入れと別の操作です。

公式資料：[Pages公開元の設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)。

## 通信・プライバシー・配布物

miruの写真送信API、有料API、解析タグ、ユーザー登録は追加していません。写真・映像はCanvas／WASMで端末内処理します。モデル初回取得には通信が必要です。外部配布元には通常のHTTPリクエスト情報（IP等）が届きますが、アプリは写真をリクエストに付けません。

- JS / WASM: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/` 以下。同じ固定版を使用。
- モデル: `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`（約4.56MB）。
- アプリ: 利用者が選んだHTTPS配信元。

MediaPipe資料：[Object Detector](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector)、[MediaPipeライセンス](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)。依存コード・モデル・CDN側の利用統計と配布条件をすべて監査済みとは扱いません。製品公開前に当該配布物のライセンス・通知・プライバシー条件を確認してください。

## 検証結果（2026-10-24）

### 確認済み

- 修正前head `82cfdfc` のv0.3テスト4件成功。リポジトリにはpackage.jsonと旧版テストがなかったため、以前の納品版から旧版テスト5件を復元し、初期状態で計9件成功。
- 修正後 `npm test`：19件成功。旧版クロップ／カメラ停止、3構図、障害物回避、縦横比投影とCanvas cover一致、画角外物体の無視、全身枠のはみ出し防止、決定的ランキング、スコア内訳、モデル共有／失敗再試行／タイムアウト／遅延解放、検出座標の正規化、エラー段階、デバッグ非有効時のDOM非作成に加え、実アプリのイベント処理を用いた遅延解析の破棄・失敗時の通常撮影・保存開始時の比率と配置の固定を確認。
- JSとモデル配布URLのHTTP 200を確認。モデル取得は約4.56MB。HTTP確認だけを推論成功と混同していません。
- Macのアプリ内ブラウザで実際のモデル読み込み／WASM初期化／CPU推論が成功。同梱サンプルの初回観測：モデル準備4,937ms、推論217ms、全体5,304ms。`umbrella`信頼度0.4336を1件検出。サンプルイラストへの検出であり、正しい認識・品質の証明ではありません。

- Macアプリ内ブラウザで3比率の再評価・元の比率への復帰とデバッグ表示を確認。構図画像保存ボタンの操作時にアプリ例外は確認されませんでしたが、保存先ファイルと保存完了は未確認です。

### 未検証・受け入れ保留

- iPhone Safari実機のモデルロード、写真ピッカー、HEIC、背面撮影、長押しでの写真アプリ保存完了。
- 建物・海・公園・室内・混雑した街の実写真5種で、固定テンプレート版より悪くならないこと。誤検出・未検出・混雑時の提案品質。
- iPhoneでの初回／2回目解析時間、発熱、連続使用、クラッシュ、実際のオフラインと権限拒否。
- 別HTTPS環境の公開・アクセス、依存配布物の全ライセンス／利用統計監査。

実機未検証のためIssue #4の完了条件は未達です。PRはマージしないでください。

## 実機確認チェックリスト

1. 別HTTPS URLをiPhone Safariで開き、`?debug=1` で初回・2回目の時間、認識物体、位置、スコア、エラーを記録。
2. 建物・海・公園・室内・混雑した街で3構図とポーズを比較。人物や重要な背景と重ならず、素材の全身が意図せず切れないか確認。
3. 4:5→9:16→1:1→4:5と切替え、画角に合わせて位置が再評価されること、最初の比率に戻すと同じ位置になることを確認。
4. 解析待ちのまま撮影へ移動し、後からガイドが勝手に変わらないことを確認。背景変更後に古い結果が表示されないことも確認。
5. 構図画像保存の直後に比率・構図を変更し、保存結果は押した時点の構図であることを確認。選んだガイドと撮影画面の位置・比率が一致することを確認。
6. ガイドのオン／オフ、通常撮影、戻る、再撮影、標準カメラ／ライブラリ、共有キャンセル、写真保存を確認。
7. 初回ロードでネットワークを切り、固定構図へのフォールバックとモデル再試行を確認。カメラ拒否時も写真選択で続けられることを確認。
