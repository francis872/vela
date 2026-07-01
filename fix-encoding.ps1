$f = "C:\Users\Usuario\OneDrive\Escritorio\VELA\src\app\vela\command-dashboard.tsx"
$c = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)

function rep($old, $new) { return $c.Replace([string]$old, [string]$new) }

# 2-byte Latin-1 (Ã/Â prefix) - use string overload explicitly
$c = $c.Replace(([string][char]0xC3 + [string][char]0xB3), [string][char]0xF3)
$c = $c.Replace(([string][char]0xC3 + [string][char]0xB1), [string][char]0xF1)
$c = $c.Replace(([string][char]0xC3 + [string][char]0xA9), [string][char]0xE9)
$c = $c.Replace(([string][char]0xC3 + [string][char]0xA1), [string][char]0xE1)
$c = $c.Replace(([string][char]0xC3 + [string][char]0xAD), [string][char]0xED)
$c = $c.Replace(([string][char]0xC3 + [string][char]0xBA), [string][char]0xFA)
$c = $c.Replace(([string][char]0xC3 + [string][char]0xBC), [string][char]0xFC)
$c = $c.Replace(([string][char]0xC2 + [string][char]0xBF), [string][char]0xBF)
$c = $c.Replace(([string][char]0xC2 + [string][char]0xB7), [string][char]0xB7)

# 3-byte Unicode chars
# em dash U+2014: bytes E2 80 94 -> CP1252: a(E2) euro(80=€) right-dquote(94=")
$c = $c.Replace(([string][char]0xE2+[string][char]0x20AC+[string][char]0x201D), [string][char]0x2014)
# arrow right U+2192: bytes E2 86 92 -> CP1252: a(E2) dagger(86=†) rsquote(92=')
$c = $c.Replace(([string][char]0xE2+[string][char]0x2020+[string][char]0x2019), [string][char]0x2192)
# box draw U+2500: bytes E2 94 80 -> CP1252: a(E2) right-dquote(94=") euro(80=€)
$c = $c.Replace(([string][char]0xE2+[string][char]0x201D+[string][char]0x20AC), [string][char]0x2500)
# warning U+26A0: bytes E2 9A A0 -> CP1252: a(E2) s-caron(9A=š) nbsp(A0)
$c = $c.Replace(([string][char]0xE2+[string][char]0x161+[string][char]0xA0), [string][char]0x26A0)
# checkmark U+2713: bytes E2 9C 93 -> CP1252: a(E2) oe(9C=œ) left-dquote(93=")
$c = $c.Replace(([string][char]0xE2+[string][char]0x153+[string][char]0x201C), [string][char]0x2713)

[IO.File]::WriteAllText($f, $c, [Text.Encoding]::UTF8)
Write-Host "Done"
