import HomePage from '../pages/home/home-page';
import StoriesPage from '../pages/stories/stories-page';
import AddStoryPage from '../pages/add-story/add-story-page';
import AboutPage from '../pages/about/about-page';
import LoginPage from '../pages/login/login-page';
import RegisterPage from '../pages/register/register-page';

const routes = {
  '/': HomePage,
  '/stories': StoriesPage,
  '/add-story': AddStoryPage,
  '/about': AboutPage,
  '/login': LoginPage,
  '/register': RegisterPage,
};

export default routes;