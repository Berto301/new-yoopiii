import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserPreferencesProvider } from "../preferences/UserPreferencesProvider.jsx";
import { PwaProvider } from "../pwa/PwaProvider.jsx";
import { store } from "../store/session.store.js";
import { SocketSessionBridge } from "./components/SocketSessionBridge.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const AppProviders = ({ children }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <UserPreferencesProvider>
        <PwaProvider>
          <SocketSessionBridge />
          {children}
        </PwaProvider>
      </UserPreferencesProvider>
    </QueryClientProvider>
  </Provider>
);
