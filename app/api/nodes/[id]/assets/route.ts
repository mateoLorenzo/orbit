import { NextResponse } from 'next/server'
import { getNodeAssets } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const assets = await getNodeAssets(id)
  return NextResponse.json(assets)
}
