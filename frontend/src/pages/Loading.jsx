function Loading() {
  return (
    <div
      className="flex h-screen w-screen items-center justify-center bg-linear-to-b from-blue-400 to-blue-600 text-2xl text-white backdrop-opacity-60"
    >
      <div
        role="status"
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent"
      />
    </div>
  )
}

export default Loading
