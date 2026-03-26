import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "../store/session.store.js";

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </Provider>
);
