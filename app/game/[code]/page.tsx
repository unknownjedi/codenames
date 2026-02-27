import { GameRoom } from './GameRoom';

export default async function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <GameRoom code={code.toUpperCase()} />;
}
