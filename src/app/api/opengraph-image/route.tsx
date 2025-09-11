import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getNeynarUser } from "~/lib/neynar";
import { APP_NAME } from "~/lib/constants";

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  const user = fid ? await getNeynarUser(Number(fid)) : null;

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full flex-col items-center justify-center relative"
        style={{
          background:
            "linear-gradient(135deg, rgba(193,153,228,0.25) 0%, rgba(52,30,100,0.6) 60%, rgba(26,15,56,0.9) 100%)",
        }}
      >
        {/* Decorative Blurs for depth */}
        <div tw="absolute -top-24 -left-24 rounded-full opacity-30" style={{ width: 420, height: 420, background: 'radial-gradient(circle at 30% 30%, #c199e4, transparent 60%)', filter: 'blur(40px)' }} />
        <div tw="absolute -bottom-28 -right-28 rounded-full opacity-20" style={{ width: 460, height: 460, background: 'radial-gradient(circle at 70% 70%, #7c4fd6, transparent 60%)', filter: 'blur(40px)' }} />
        {/* Header */}
        <div tw="absolute top-12 left-12 flex items-center">
          <div tw="w-20 h-20 rounded-2xl" style={{
            background: "linear-gradient(135deg, #c199e4 0%, #b380db 100%)",
          }} />
          <div tw="ml-6 flex flex-col">
            <div tw="text-2xl text-white/80">AI-powered DCA on Arbitrum</div>
          </div>
        </div>

        {/* Center Card */}
        <div tw="flex items-center justify-center w-full">
          <div tw="w-[920px] rounded-3xl border border-white/15 bg-white/10 shadow-2xl px-18 py-16 flex flex-col items-center" style={{ backdropFilter: 'blur(6px)' }}>
          {user?.pfp_url && (
            <div tw="flex w-44 h-44 rounded-full overflow-hidden mb-6 border-6 border-white/90 shadow-2xl" style={{ display: 'flex' }}>
              <img src={user.pfp_url} alt="Profile" tw="w-full h-full object-cover" />
            </div>
          )}
          <h1 tw="text-7xl text-white font-extrabold tracking-tight text-center" style={{ display: 'flex' }}>
            {user?.display_name
              ? `Welcome, ${user.display_name ?? user.username}`
              : "DCA Agent"}
          </h1>
          <p tw="text-3xl mt-6 text-white/90 text-center" style={{ display: 'flex' }}>
            • Talk to DCA agent • Create plans • Track executions
          </p>
          </div>
        </div>

      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  );
}