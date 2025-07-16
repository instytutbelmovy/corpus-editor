using System.Buffers;
using System.Text;

namespace Editor.Converters;

public sealed class TxtReader : IDocumentReader
{
    private static readonly Encoding Windows1251;

    static TxtReader()
    {
        // Ensure that the Windows-1251 encoding is registered
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        Windows1251 = Encoding.GetEncoding("windows-1251");
    }

    public IEnumerable<string> Read(Stream stream)
    {
        var encoding = GetEncoding(stream);
        var file = new StreamReader(stream, encoding);

        while (file.ReadLine() is { } line)
        {
            line = line.Trim();
            if (!string.IsNullOrEmpty(line))
                yield return line;
        }
    }

    private static Encoding GetEncoding(Stream stream)
    {
        const int sizeToCheck = 64;
        var buffer = ArrayPool<byte>.Shared.Rent(sizeToCheck);
        try
        {
            int read = stream.Read(buffer, 0, sizeToCheck);
            if (read < 4)
                return Encoding.UTF8;

            if (buffer[0] == 0x2b && buffer[1] == 0x2f && buffer[2] == 0x76) return Encoding.UTF7;
            if (buffer[0] == 0xef && buffer[1] == 0xbb && buffer[2] == 0xbf) return Encoding.UTF8;
            if (buffer[0] == 0xff && buffer[1] == 0xfe && buffer[2] == 0 && buffer[3] == 0) return Encoding.UTF32; //UTF-32LE
            if (buffer[0] == 0xff && buffer[1] == 0xfe) return Encoding.Unicode; //UTF-16LE
            if (buffer[0] == 0xfe && buffer[1] == 0xff) return Encoding.BigEndianUnicode; //UTF-16BE
            if (buffer[0] == 0 && buffer[1] == 0 && buffer[2] == 0xfe && buffer[3] == 0xff) return new UTF32Encoding(true, true);  //UTF-32BE

            var countD0 = 0;
            var countWin1251 = 0;
            for (int i = 0; i < read; i++)
            {
                if (buffer[i] >= 0xD0 && buffer[i] <= 0xD1) countD0++;
                if (buffer[i] >= 0xC0 || buffer[i] == 0xa1 || buffer[i] == 0xa2 || buffer[i] == 0xb2 || buffer[i] == 0xb3) countWin1251++;
            }

            if (countD0 > sizeToCheck / 4)
                return Encoding.UTF8;

            if (countWin1251 > sizeToCheck / 4)
                return Windows1251;

            return Encoding.UTF8;
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
            stream.Seek(0, SeekOrigin.Begin);
        }
    }
}