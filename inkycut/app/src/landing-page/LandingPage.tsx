import { features, faqs, footerNavigation, testimonials } from './contentSections';
import Hero from './components/Hero';
import Clients from './components/Clients';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Footer from './components/Footer';

export default function LandingPage() {
  const hasClients = false;
  
  return (
    <div className='bg-white dark:text-white dark:bg-boxdark-2'>
      <main className='isolate dark:bg-boxdark-2'>
        <Hero />
        { hasClients && <Clients /> }
        
        {/* MVP Release Announcement */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mx-auto max-w-7xl mt-8 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                🎉 MVP Released!
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  We just released our Minimal Viable Product! If you encounter any bugs or have feedback, 
                  please submit them to{' '}
                  <a 
                    href="https://github.com/inkylabs-dev/inkycut/issues" 
                    className="font-medium underline text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-100"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    our GitHub issues page
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Features features={features} />
        <Testimonials testimonials={testimonials} />
        <FAQ faqs={faqs} />
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
