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
    <select
      aria-label="AI provider"
      title="Choose AI provider"
      className="text-sm pl-2 pr-1 outline-none"
      onChange={handleChange}
      value={value}
    >
      {providers.map((provider) => (
        <option
          key={provider.value}
          value={provider.value}
          className="dark:bg-[#0f0f17]"
        >
          {provider.label}
        </option>
      ))}
    </select>
  )
}

export default AIProviderSelect
