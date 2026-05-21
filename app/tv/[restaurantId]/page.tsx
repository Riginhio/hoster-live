import { GameScreen } from "@/components/game/GameScreen";

type TvPageProps = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export default async function TvPage({ params }: TvPageProps) {
  const { restaurantId } = await params;
  return <GameScreen restaurantId={restaurantId} />;
}
