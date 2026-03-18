import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

// 提示されたリスト（一部抜粋してループ構造にしています）
const storeRawData = [
    { id: "1360", name: "FIT365羽生", corp: "C003" }, // カゴハラゴルフ
    { id: "1350", name: "FIT365浦和太田窪", corp: "C007" }, // ファイコム
    { id: "242",  name: "FIT365横手", corp: "C016" }, // ヤマサ興産
    { id: "605",  name: "FIT365岡山津高", corp: "C021" }, // 天満屋
    { id: "1335", name: "FIT365桶川", corp: "C007" },
    { id: "550",  name: "FIT365加古川", corp: "C002" },
    { id: "1507", name: "FIT365加美東", corp: "C002" },
    { id: "1506", name: "FIT365貝塚", corp: "C004" }, // H3
    { id: "427",  name: "FIT365刈谷", corp: "C008" },
    { id: "1519", name: "FIT365関学三田", corp: "C002" },
    { id: "711",  name: "FIT365丸亀", corp: "C002" },
    { id: "582",  name: "FIT365岸和田今木町", corp: "C007" },
    { id: "1106", name: "FIT365岩見沢", corp: "C001" },
    { id: "424",  name: "FIT365金沢示野", corp: "C001" },
    { id: "1109", name: "FIT365釧路桂", corp: "C001" },
    { id: "1332", name: "FIT365熊谷", corp: "C003" },
    { id: "587",  name: "FIT365栗東", corp: "C010" }, // 伊藤佑
    { id: "224",  name: "FIT365郡山", corp: "C017" },
    { id: "1344", name: "FIT365古正寺", corp: "C009" },
    // ... 必要に応じてここに追加可能ですが、まずはこの塊を処理します
];

async function upload() {
    // 25件ずつに分割して送信
    for (let i = 0; i < storeRawData.length; i += 25) {
        const batch = storeRawData.slice(i, i + 25).map(store => ({
            PutRequest: {
                Item: {
                    PK: `STORE#${store.id}`,
                    SK: "METADATA",
                    name: store.name,
                    corpId: store.corp,
                    type: "STORE"
                }
            }
        }));

        const command = new BatchWriteCommand({
            RequestItems: {
                "QSC_MasterTable": batch
            }
        });

        try {
            await docClient.send(command);
            console.log(`Uploaded batch ${i / 25 + 1}`);
        } catch (err) {
            console.error("Error:", err);
        }
    }
    console.log("Finish!");
}

upload();