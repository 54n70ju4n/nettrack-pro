import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Reuse cached lists across navigations instead of refetching the
			// 500-row points/spaces queries on every page mount.
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
		},
	},
});