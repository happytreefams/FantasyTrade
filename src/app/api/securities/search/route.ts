import { AssetType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAccount } from "@/lib/current-account";
import { getLatestPrice, searchSecurities } from "@/lib/market-data";
import { getWatchedSecurityIds } from "@/lib/watchlist";

function parseAssetType(value: string | null): AssetType | undefined {
  if (value && value in AssetType) return value as AssetType;
  return undefined;
}

export async function GET(request: Request) {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const assetType = parseAssetType(searchParams.get("type"));

  const securities = await searchSecurities(query, 8, assetType);
  const watched = await getWatchedSecurityIds(
    account.id,
    securities.map((security) => security.id),
  );

  const results = await Promise.all(
    securities.map(async (security) => ({
      ...security,
      lastClose: (await getLatestPrice(security.id))?.closePrice ?? null,
      isWatched: watched.has(security.id),
    })),
  );

  return NextResponse.json(results);
}
