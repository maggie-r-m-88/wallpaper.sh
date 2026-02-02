export default function Footer() {
    return (
         <footer className="py-12 text-center text-gray-400 text-sm w-full">
        <div className="max-w-7xl mx-auto px-8">
          <p>Built by hand, with care. All images sourced from open cultural archives.</p>
          <p className="mt-4">
            <a
              href="https://github.com/yourusername/commonscapes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 no-underline hover:text-gray-900"
            >
              GitHub
            </a>{" "}
            ·{" "}
            <a
              href="mailto:your@email.com"
              className="text-gray-600 no-underline hover:text-gray-900"
            >
              Contact
            </a>
          </p>
        </div>
      </footer>
    );
}