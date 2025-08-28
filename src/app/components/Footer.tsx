export const Footer = () => {
  return (
    <footer className="text-xs text-gray-500 p-4 text-center border-t border-gray-200 mt-auto">
      <a 
        className="underline mx-2 hover:text-gray-700" 
        href="/privacy.html" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        プライバシーポリシー
      </a>
      <a 
        className="underline mx-2 hover:text-gray-700" 
        href="/terms.html" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        利用規約
      </a>
    </footer>
  );
};