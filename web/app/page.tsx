import { Header } from "./components/header";
import { VaultDashboard } from "./components/vault-dashboard";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <VaultDashboard />

      <footer className="fixed bottom-0 w-full p-4 text-center text-xs text-white/20 pointer-events-none">
        CVX Prototype. Runs on Localnet.
      </footer>
    </main>
  );
}
