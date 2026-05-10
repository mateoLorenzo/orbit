import { NextResponse } from 'next/server'
import { getNodeAssets } from '@/lib/db/queries'
import { presignArtifactGet } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const assets = await getNodeAssets(id)

  const presignAsset = async <T extends { s3Key: string; durationSec?: number } | null>(
    a: T,
  ): Promise<unknown> => {
    if (!a) return null
    const url = await presignArtifactGet(a.s3Key)
    if ('durationSec' in a) {
      return { url, durationSec: (a as { durationSec: number }).durationSec }
    }
    return { url }
  }

  return NextResponse.json({
    status: assets.status,
    lesson: assets.lesson,
    image: await presignAsset(assets.image),
    audio: await presignAsset(assets.audio),
    podcast: await presignAsset(assets.podcast),
    video: await presignAsset(assets.video),
  })
}
