throw new Error("THIS IS THE REAL FILE");
import { NextApiRequest, NextApiResponse } from "next";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  PutCommand, 
  DeleteCommand 
} from "@aws-sdk/lib-dynamodb";

// --- 1. AWS SDK 初期化 ---
// 環境変数のブレをなくすため、設定状況をコンソールに出力します
console.log("[DEBUG] Initializing DynamoDB Client...");
console.log("[DEBUG] Region:", process.env.AWS_REGION || "NOT SET (Defaulting to us-east-1)");

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || "us-east-1" 
});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "QSC_UserTable";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  // サーバーのターミナル（Next.js実行画面）に表示されます
  console.log(`\n=== [API DEBUG START: ${method}] ===`);

  try {
    // ==========================================
    // GET: ユーザー一覧取得 (デバッグ強化版)
    // ==========================================
    if (method === "GET") {
      console.log(`[GET] Fetching from table: ${TABLE_NAME}...`);

      const response = await ddbDocClient.send(new ScanCommand({
        TableName: TABLE_NAME,
      }));

      // --- デバッグログ: DBから何が返ってきたか ---
      console.log(`[GET] DB Raw Count: ${response.Count}`);
      console.log(`[GET] DB ScannedCount: ${response.ScannedCount}`);

      if (response.Items && response.Items.length > 0) {
        console.log("[GET] First Item Preview:", JSON.stringify(response.Items[0], null, 2));
      } else {
        console.warn("[GET] WARNING: Items array is EMPTY from DynamoDB!");
      }

      // --- データ整形ロジック ---
      const mappedItems = (response.Items || []).map((item, index) => {
        const userId = item.userId || item.PK?.replace("USER#", "") || `unknown-${index}`;
        
        return {
          userId: userId,
          name: item.name || "名称未設定",
          email: item.email || "",
          role: item.role || "inspector",
          corpId: item.corpId || "",
          status: item.status || "invited",
          clubCodes: Array.isArray(item.clubCodes) ? item.clubCodes : [],
          lastLogin: item.lastLogin || null,
          createdAt: item.createdAt || "",
          updatedAt: item.updatedAt || "",
        };
      });

      console.log(`[GET] Mapping complete. Returning ${mappedItems.length} items to frontend.`);
      console.log("=== [API DEBUG END] ===\n");

      return res.status(200).json({ 
        ok: true, 
        count: response.Count, 
        items: mappedItems 
      });
    }

    // ==========================================
    // POST / PUT: 作成・更新
    // ==========================================
    if (method === "POST" || method === "PUT") {
      const body = req.body;
      const userId = body.userId || `U${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const now = new Date().toISOString();
      
      console.log(`[${method}] Processing user: ${userId}`);

      const newItem = {
        PK: `USER#${userId}`,
        SK: "METADATA",
        ...body,
        userId: userId,
        updatedAt: now,
        ...(method === "POST" ? { createdAt: now } : {}),
      };

      await ddbDocClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: newItem,
      }));

      return res.status(method === "POST" ? 201 : 200).json({ ok: true, item: newItem });
    }

    // ==========================================
    // DELETE: 削除
    // ==========================================
    if (method === "DELETE") {
      const { userId } = req.query;
      console.log(`[DELETE] Target ID: ${userId}`);

      await ddbDocClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: "METADATA" }
      }));

      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();

  } catch (error: any) {
    console.error("!!! [CRITICAL API ERROR] !!!");
    console.error("Message:", error.message);
    console.error("Code:", error.code || error.__type);
    console.log("=== [API DEBUG END WITH ERROR] ===\n");
    
    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      code: error.code || error.__type
    });
  }
}