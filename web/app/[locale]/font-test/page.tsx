// Font Test Component
'use client';

export default function FontTest() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-4xl font-bold">Font Test</h1>
      <p className="text-lg">This is a test of the font system.</p>
      <p className="text-lg">English: The quick brown fox jumps over the lazy dog</p>
      <p className="text-lg">Vietnamese: Tôi yêu món ăn Việt Nam</p>
      <p className="text-lg">Japanese: 私は日本料理が好きです</p>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">CSS Variables:</h3>
        <div className="text-sm font-mono">
          <div>--font-sans: <span className="font-sans">Sample Text</span></div>
        </div>
      </div>
    </div>
  );
}
