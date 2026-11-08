import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'deals',
			component: () => import('../views/PanelListingView.vue'),
		},
		{
			path: '/deals/:id',
			name: 'deal',
			component: () => import('../views/PanelSingleView.vue'),
			props: true,
		},
	],
})

export default router