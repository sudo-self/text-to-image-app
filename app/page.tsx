"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Code, Copy, Download, ImageIcon, Loader2, Terminal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRef } from "react"

const API_URL = "https://text-to-image.jessejesse.workers.dev"

export default function TextToImagePlayground() {
  const [prompt, setPrompt] = useState("")
  const [method, setMethod] = useState("POST")
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [error, setError] = useState("")
  const [outputFilename, setOutputFilename] = useState("generated-image.png")
  const { toast } = useToast()
  const outputFileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError("")
    setImageUrl("")

    try {
      let response

      if (method === "POST") {
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        })
      } else {
        // For GET and WGET, we'll use GET request
        response = await fetch(`${API_URL}?prompt=${encodeURIComponent(prompt)}`)
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`)
      }

      // Check if the response is an image
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.startsWith("image/")) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setImageUrl(url)
      } else {
        // If it's not an image, try to parse as JSON
        const data = await response.json()
        if (data.url) {
          setImageUrl(data.url)
        } else {
          throw new Error("Response did not contain an image or image URL")
        }
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The code has been copied to your clipboard",
    })
  }

  const getCodeExample = () => {
    if (method === "POST") {
      return `fetch("${API_URL}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: "${prompt}"
  })
})
.then(response => response.blob())
.then(blob => {
  const url = URL.createObjectURL(blob)
  console.log("Image URL:", url)
})
.catch(error => console.error("Error:", error))`
    } else if (method === "GET") {
      return `fetch("${API_URL}?prompt=${encodeURIComponent(prompt)}")
.then(response => response.blob())
.then(blob => {
  const url = URL.createObjectURL(blob)
  console.log("Image URL:", url)
})
.catch(error => console.error("Error:", error))`
    } else {
      return `# Using wget in terminal
wget -O generated-image.png "${API_URL}?prompt=${encodeURIComponent(prompt)}"`
    }
  }

  const downloadImage = (url: string, format: string) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = url

    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        toast({
          title: "Error",
          description: "Could not create canvas context for image conversion",
          variant: "destructive",
        })
        return
      }

      // Draw image on canvas
      ctx.drawImage(img, 0, 0)

      let downloadUrl
      let filename = `generated-image-${Date.now()}`

      if (format === "png") {
        downloadUrl = canvas.toDataURL("image/png")
        filename += ".png"
      } else if (format === "jpg") {
        downloadUrl = canvas.toDataURL("image/jpeg", 0.9)
        filename += ".jpg"
      } else if (format === "svg") {
        // Basic SVG conversion (very simplified)
        const svgWidth = canvas.width
        const svgHeight = canvas.height
        const svgData = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
            <image width="${svgWidth}" height="${svgHeight}" href="${canvas.toDataURL("image/png")}" />
          </svg>
        `
        const blob = new Blob([svgData], { type: "image/svg+xml" })
        downloadUrl = URL.createObjectURL(blob)
        filename += ".svg"
      }

      // Create download link
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up
      if (format === "svg") {
        URL.revokeObjectURL(downloadUrl)
      }
    }

    img.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load image for conversion",
        variant: "destructive",
      })
    }
  }

  const getCommandOutput = () => {
    const filename = outputFilename || "generated-image.png"

    if (method === "POST") {
      return `curl -X POST ${API_URL} -H "Content-Type: application/json" -d '{"prompt":"${prompt}"}' --output ${filename}`
    } else if (method === "GET") {
      return `curl "${API_URL}?prompt=${encodeURIComponent(prompt)}" --output ${filename}`
    } else {
      return `wget "${API_URL}?prompt=${encodeURIComponent(prompt)}" -O ${filename}`
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Text-to-Image</h1>
      <p className="text-center mb-8 text-muted-foreground">image.JesseJesse.com</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Text Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter a description of the image you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Request Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="WGET">WGET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="code">
                  <Code className="mr-2 h-4 w-4" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="curl">
                  <Terminal className="mr-2 h-4 w-4" />
                  cURL
                </TabsTrigger>
                <TabsTrigger value="wget">
                  <Terminal className="mr-2 h-4 w-4" />
                  wget
                </TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                    <code>{getCodeExample()}</code>
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(getCodeExample())}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy code</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="curl" className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                    <code>
                      {method === "POST"
                        ? `➜ curl -X POST ${API_URL} \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"${prompt}"}' \\
  --output generated-image.png

  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 1708k  100 1708k  100    27   138k      2  0:00:13  0:00:12  0:00:01  400k`
                        : `➜ curl "${API_URL}?prompt=${encodeURIComponent(prompt)}" \\
  --output generated-image.png

  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 1716k  100 1716k    0     0   159k      0  0:00:10  0:00:10 --:--:--  365k`}
                    </code>
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      copyToClipboard(
                        method === "POST"
                          ? `curl -X POST ${API_URL} -H "Content-Type: application/json" -d '{"prompt":"${prompt}"}' --output generated-image.png`
                          : `curl "${API_URL}?prompt=${encodeURIComponent(prompt)}" --output generated-image.png`,
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy code</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="wget" className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                    <code>
                      {`➜ wget "${API_URL}?prompt=${encodeURIComponent(prompt)}" -O generated-image.png

--2025-04-25 11:15:44--  ${API_URL}?prompt=${encodeURIComponent(prompt)}
Resolving text-to-image.jessejesse.workers.dev (text-to-image.jessejesse.workers.dev)... 104.21.41.67, 172.67.189.197
Connecting to text-to-image.jessejesse.workers.dev (text-to-image.jessejesse.workers.dev)|104.21.41.67|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1290642 (1.2M) [image/png]
Saving to: 'generated-image.png'

generated-image.png                   100%[=====================================================================>]   1.23M  3.98MB/s    in 0.3s    

2025-04-25 11:15:54 (3.98 MB/s) - 'generated-image.png' saved [1290642/1290642]`}
                    </code>
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      copyToClipboard(`wget "${API_URL}?prompt=${encodeURIComponent(prompt)}" -O generated-image.png`)
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy code</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>The generated image will appear here</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Generating image...</p>
              </div>
            ) : error ? (
              <div className="text-center p-8 text-destructive">
                <p className="font-semibold">Error</p>
                <p className="mt-2">{error}</p>
              </div>
            ) : imageUrl ? (
              <div className="flex flex-col items-center">
                <div className="relative border rounded-md overflow-hidden">
                  <Image
                    src={imageUrl || "/placeholder.svg?height=400&width=400"}
                    alt={`Generated image for: ${prompt}`}
                    width={400}
                    height={400}
                    className="object-contain"
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground text-center max-w-md">{prompt}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Enter a prompt and click "Generate Image" to see the result
                </p>
              </div>
            )}
          </CardContent>
          {imageUrl && (
            <CardFooter className="flex flex-col space-y-4 w-full">
              <div className="w-full">
                <Label className="mb-2 block">Export Format</Label>
                <RadioGroup defaultValue="png" className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png" id="png" />
                    <Label htmlFor="png">PNG</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jpg" id="jpg" />
                    <Label htmlFor="jpg">JPG</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="svg" id="svg" />
                    <Label htmlFor="svg">SVG</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const radioButtons = document.querySelectorAll('input[type="radio"]')
                  let selectedFormat = "png"

                  for (const button of radioButtons) {
                    if (
                      (button as HTMLInputElement).checked &&
                      ["png", "jpg", "svg"].includes((button as HTMLInputElement).value)
                    ) {
                      selectedFormat = (button as HTMLInputElement).value
                      break
                    }
                  }

                  downloadImage(imageUrl, selectedFormat)
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Image
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Command Line Syntax</CardTitle>
            <CardDescription>Copy the command to use in your terminal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cmd-prompt">Text Prompt</Label>
                  <Textarea
                    id="cmd-prompt"
                    placeholder="Enter your prompt..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cmd-method">Command Type</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger id="cmd-method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">cURL (POST)</SelectItem>
                        <SelectItem value="GET">cURL (GET)</SelectItem>
                        <SelectItem value="WGET">wget</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="output-file">Output Filename</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="output-file"
                        type="text"
                        ref={outputFileRef}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="generated-image.png"
                        defaultValue="generated-image.png"
                        onChange={(e) => setOutputFilename(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Label>Command</Label>
                <pre className="mt-2 bg-muted p-4 rounded-md overflow-x-auto text-sm">
                  <code>{getCommandOutput().replace(/\\\n\s+/g, " ")}</code>
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(getCommandOutput().replace(/\\\n\s+/g, " "))}
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy code</span>
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => copyToClipboard(getCommandOutput().replace(/\\\n\s+/g, " "))} className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Copy Command
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
