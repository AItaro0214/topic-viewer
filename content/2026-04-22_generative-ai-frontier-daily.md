# Google Cloud Next 26開幕、Anthropic＋Broadcomの数ギガW契約、Spud足踏み――生成AI 4月22日速報
*2026年4月22日 | Google Cloud・Anthropic・OpenAI・Reddit r/singularity*

## Google Cloud Next 2026：エージェント経済への本格移行

ラスベガスで開幕した**Google Cloud Next 2026**（4月22〜24日）で、CEO Sundar Pichai氏は**「2026年はエージェント経済の元年」**と明言した。同日に発表された主要トピックは以下の通り。

| 発表 | 内容 |
|---|---|
| **Gemini Enterprise Agent Platform** | Vertex AIを刷新・改称。AgentspaceやModel Gardenを統合した単一基盤 |
| **Model Garden 200+** | Gemini 3.1 Pro/Flash、Gemma 4、Lyria 3、**Anthropic Claude Opus/Sonnet/Haiku**にも単一APIでアクセス |
| **Workspace Studio** | ノーコードでGmail/Docs/Sheets横断のエージェントを構築 |
| **Project Mariner** | Chrome統合のWebブラウジング・エージェント、一般提供へ |
| **Managed MCP Servers** | Google Cloud全サービスに対するManaged MCP。既存ツールと即接続 |
| **A2A Protocol v1.0** | 150組織で本番稼働開始。異ベンダー・エージェント間の通信規格 |
| **Gemini Embedding 2** | 本日GAに昇格。長文・多言語の検索品質が大幅向上 |
| **Deep Research / Deep Research Max** | Gemini 3.1 Pro搭載の長時間自律リサーチ。MCP連携とネイティブ可視化 |

ハードウェアも刷新された。第8世代TPUは訓練向け**TPU 8t**と推論向け**TPU 8i**の2系統構成で、前者は新ICIで9,600基・2PBの共有高帯域メモリを単一スーパーポッドに束ね、後者はBoardfly トポロジで1,152基を直結し、**前世代比ドルあたり推論性能+80%**を実現する。

> 「APIを通じて主要モデルが処理するトークンは毎分160億に達し、前四半期の約100億から急伸した」——Sundar Pichai CEO

## Anthropic × Alphabet × Broadcom：2027年から「複数ギガワット」のTPU調達

同じ4月22日、AnthropicはGoogle・Broadcomとの**数ギガワット規模**のTPU調達パートナーシップを発表した。**2027年**からの供給開始を見込み、計算資源を既存のAWS Trainiumおよび自社最適化スタックに加え、複数クラウドへ分散させる戦略である。

- **Alphabet／Broadcom株価**は発表翌日にそれぞれ上昇
- AnthropicはAWSとの大規模契約（2024〜2026）に加え、**Google依存度を中期で拡大**
- Broadcomはカスタムシリコンとネットワーキングの両面でAnthropic案件を獲得
- 記者会見でAnthropic CFOは「Claude Opus 4.7以降、需要が供給を慢性的に上回っている」と表明

これにより、**OpenAI（MS Azure＋自社施設）／Anthropic（AWS＋Google＋Broadcom）／Google（自社TPU垂直統合）**という3極の計算資源ポートフォリオが、ハイパースケーラ戦争を再定義する構図が一段と明確になった。

## OpenAI：「Spud」は沈黙、Images 2.0が一人歩き

OpenAI側は4月22日時点で**GPT-5.5（コードネーム「Spud」）**の公式アナウンスを出していない。時系列整理は以下の通り。

| 日付 | 出来事 |
|---|---|
| 3月24日 | Spudの**事前学習完了**、Sam Altmanが言及 |
| 4月14日 | 一部リークで「この日リリース」と噂 → 外れる |
| 4月21日 | 週末時点でもAltmanのツイートなし。r/singularityで「Spud is still baking」が流行語化 |
| 4月22日 | 公式情報ゼロ。一方で**ChatGPT Images 2.0**が実運用で話題 |

Greg Brockman氏の過去発言が再び引用されている。「2年間の研究の集大成で、**大型モデルの感触（big model feel）**がある。インクリメンタルな改善ではない」。

コミュニティの共通見解は、
- **数週間〜数ヶ月**先の出荷が妥当
- 呼称は**GPT-5.5またはGPT-6**、社内評価次第
- 機能面では**SVG生成・フロントエンド設計自動化・3Dインタラクティブ世界生成**の噂が根強い

## Reddit r/singularity：「追いかけきれない」祭り

**r/singularity**では4月22日夜、Google Cloud Next 26のハイライトまとめと、Spudリリース時期に関するスレッドが同時にトップを占めた。代表的な反応を日本語に要約する。

> 「Google単独で1日分のAI予算よりも多いアップデートをぶち込んできた」——Upvote 4,100
>
> 「A2AとMCPが揃った。これで『エージェント相互運用』がようやく現実になる」——Upvote 2,800
>
> 「Spud待ちで何もかも保留にしている自分がいる。ベンチマークじゃなくて自分の精神衛生のためにリリースしてくれ」——Upvote 1,900

r/LocalLLaMA でも、GPT-5.4、Claude Opus 4.7、Gemini 3.1 Proの三つ巴比較が再燃した。現時点のコミュニティ・コンセンサスは「**コーディング=Claude、研究=GPT、企業ワークフロー=Gemini**」という役割分担だ。

## 他の注目動き

- **Anthropic Claude Opus 4.7**: 4月16日公開後、GDPval-AA Eloで1,633点と首位。**1M トークン**コンテキストを標準搭載
- **OpenAI GPT-5.4**: computer-useベンチマークで首位、GDPvalスコア83%
- **GLM-5.1（Zhipu AI・中国）**: オープン重み系で急伸、DeepSeekに並ぶ評価
- **xAI Grok 4.20**: リアルタイムWeb検索の統合深度でリード

## 示唆：4月22日に見えた3つの地殻変動

| 変動 | 象徴する出来事 | 意味 |
|---|---|---|
| **プラットフォーム統合** | Gemini Enterprise Agent Platform | 単発モデルから「エージェント運用OS」競争へ |
| **計算資源の多極化** | Anthropic × Broadcom × Google | ハイパースケーラ寡占から「計算資源ポートフォリオ」へ |
| **期待と現実のギャップ** | Spudの沈黙 | ベンチマーク・リーク過熱の中で**現物出荷こそが信認**であることを再確認 |

2026年春の生成AIは、**「何ができるか」から「どう安全に統合・運用するか」へ**評価軸が移り始めた。4月22日の発表群は、その転換点を象徴する一日となった。
