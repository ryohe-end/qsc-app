export type CategoryType = "Q" | "S" | "C";

export const QSC_ANSWER_OPTIONS = ["OK", "NG", "保留", "該当なし"] as const;
export type QscAnswerOption = (typeof QSC_ANSWER_OPTIONS)[number];

export type QscQuestion = {
  questionId: string;
  place: string;
  no: number;
  category: CategoryType;
  text: string;
  weight: number;
  required: boolean;
  isActive: boolean;
  updatedAt: string;
};

export type QscAsset = {
  assetId: string;
  name: string;
  description?: string;
  isActive: boolean;
  questionIds: string[];
  updatedAt: string;
};

export type QscStoreAssetBinding = {
  storeId: string;
  assetId: string;
  isActive: boolean;
  updatedAt: string;
};

/**
 * DynamoDB item shapes
 */
export type QscQuestionItem = QscQuestion & {
  PK: "QUESTION";
  SK: `QUESTION#${string}`;
  type: "QUESTION";
};

export type QscAssetItem = QscAsset & {
  PK: "ASSET";
  SK: `ASSET#${string}`;
  type: "ASSET";
};

export type QscStoreAssetBindingItem = QscStoreAssetBinding & {
  PK: `STORE#${string}`;
  SK: "ASSET";
  type: "STORE_ASSET";
};