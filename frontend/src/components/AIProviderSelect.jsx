const providers = [
  { value: "gemini", label: "Gemini" },
  { value: "groq", label: "Groq" },
]

function AIProviderSelect({ value, onChange }) {
  const handleChange = (event) => {
    const provider = event.target.value
    localStorage.setItem("aiProvider", provider)
    onChange(provider)
  }

  return (
    <div className="relative flex shrink-0 items-center">
      <select
        aria-label="AI provider"
        title="Choose AI provider"
        className="h-10 appearance-none bg-transparent py-2 pl-2 pr-6 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white"
        style={{ appearance: "none", WebkitAppearance: "none" }}
        onChange={handleChange}
        value={value}
      >
        {providers.map((provider) => (
          <option
            key={provider.value}
            value={provider.value}
            className="bg-white text-gray-800 dark:bg-[#303030] dark:text-white"
          >
            {provider.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 h-4 w-4 text-gray-500 dark:text-gray-300"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="m5 7.5 5 5 5-5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    </div>
  )
}

export default AIProviderSelect
