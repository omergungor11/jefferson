import HomeOpening from "./home/opening";
import HomeClosing from "./home/closing";

export default function Home() {
  return (
    <main id="main" tabIndex={-1}>
      <HomeOpening />
      <HomeClosing />
    </main>
  );
}
