
import HomeHeroImage from "./components/HomeHeroImage";
import ExploreCollection from "./components/HomeFeaturedImages";
import Header from "./components/Header";
import Footer from "./components/Footer";
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-sans bg-pattern">
      
      <Header />

      <section className="py-16 text-center w-full">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl leading-tight mb-6 text-gray-900">
            Handpicked visuals from<br />open cultural archives
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            A curated image library built from Wikimedia Commons and other freely
            licensed sources. Every image is hand-selected for quality, aesthetics,
            and visual impact. Perfect for wallpapers, ambient displays, and
            creative projects.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 w-full">
        <HomeHeroImage />
      </section>

      <section className="py-16 w-full">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12">
            <div className="text-left">
              <h3 className="text-xl font-medium mb-3 text-gray-900">
                Human-curated quality
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Automation helps fetch images, but every selection is made by a
                human. We prioritize visual impact, composition, and cultural
                significance over algorithmic rankings.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-medium mb-3 text-gray-900">
                Attribution-safe
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Every image includes complete metadata: artist, source, license,
                and link to original. No copyright concerns, no ambiguous
                licensing—just clean, properly attributed imagery.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-medium mb-3 text-gray-900">
                Built for developers
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Simple API endpoint returns full JSON with image URLs and
                metadata. Perfect for wallpaper apps, ambient displays, creative
                projects, or any application that needs quality visuals.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 text-center border-t border-gray-200 w-full">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-4xl font-normal mb-4">
            Get started with the wallpaper script
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Download our bash script to automatically change your desktop wallpaper
            every 24 hours with curated imagery.
          </p>

          <div className="bg-gray-900 text-gray-200 p-6 rounded-md font-mono text-sm text-left max-w-2xl mx-auto mb-6 overflow-x-auto">
            curl -O https://github.com/yourusername/commonscapes/raw/main/wallpaper.sh
            <br />
            chmod +x wallpaper.sh
            <br />
            ./wallpaper.sh
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://github.com/yourusername/commonscapes"
              className="inline-block px-8 py-3 bg-gray-900 text-white no-underline rounded font-medium hover:bg-gray-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
            <a
              href="#"
              className="inline-block px-8 py-3 bg-transparent text-gray-900 no-underline rounded font-medium border border-gray-900 hover:bg-gray-50 transition-colors"
            >
              API Documentation (Coming Soon)
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
