const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const IMAGES_ROOT = path.join(SRC_ROOT, "images");
const DARK_ROOT = path.join(IMAGES_ROOT, "dark");

// 다크 카드 위에서 읽히는 값. 무채색은 --color-text-muted와 같은 값이라
// 아이콘이 주변 보조 텍스트와 같은 무게로 보인다.
const GRAY_TARGET = [0xa1, 0xa1, 0xaa];
const RED_TARGET = [0xd9, 0x4a, 0x52];
const DARK_CARD = [0x16, 0x16, 0x16];

// package-extension.js와 같은 방식. zlib.crc32는 Node 22.2+에만 있어 쓰지 않는다.
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function getCrc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toLinear(value) {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

// PNG 디코딩. 8bit 그레이/RGB/팔레트/알파 조합을 모두 RGBA8로 편다.
function decodePng(file) {
  const data = fs.readFileSync(file);
  if (data.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`${file}: PNG가 아닙니다.`);
  }

  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let palette;
  let transparency;
  const idat = [];

  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const chunk = data.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      if (chunk[12] !== 0) throw new Error(`${file}: 인터레이스는 지원하지 않습니다.`);
    } else if (type === "PLTE") {
      palette = chunk;
    } else if (type === "tRNS") {
      transparency = chunk;
    } else if (type === "IDAT") {
      idat.push(chunk);
    }

    offset += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`${file}: 8bit PNG만 지원합니다.`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`${file}: 지원하지 않는 색 유형 ${colorType}.`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const lines = [];
  let previous = Buffer.alloc(stride);
  let cursor = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const line = Buffer.from(raw.subarray(cursor, cursor + stride));
    cursor += stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? line[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;

      if (filter === 1) line[x] = (line[x] + left) & 255;
      else if (filter === 2) line[x] = (line[x] + up) & 255;
      else if (filter === 3) line[x] = (line[x] + ((left + up) >> 1)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        line[x] = (line[x] + predictor) & 255;
      }
    }

    lines.push(line);
    previous = line;
  }

  const pixels = Buffer.alloc(width * height * 4);
  lines.forEach((line, y) => {
    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 4;
      if (colorType === 6) {
        line.copy(pixels, to, from, from + 4);
      } else if (colorType === 2) {
        line.copy(pixels, to, from, from + 3);
        pixels[to + 3] = 255;
      } else if (colorType === 0) {
        pixels.fill(line[from], to, to + 3);
        pixels[to + 3] = 255;
      } else if (colorType === 4) {
        pixels.fill(line[from], to, to + 3);
        pixels[to + 3] = line[from + 1];
      } else {
        const index = line[from];
        pixels[to] = palette[index * 3];
        pixels[to + 1] = palette[index * 3 + 1];
        pixels[to + 2] = palette[index * 3 + 2];
        pixels[to + 3] = transparency && index < transparency.length ? transparency[index] : 255;
      }
    }
  });

  return { width, height, pixels };
}

function encodePng({ width, height, pixels }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const chunk = (type, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(getCrc32(Buffer.concat([head.subarray(4), body])));
    return Buffer.concat([head, body, crc]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 라이트 아이콘: 색은 원본 그대로 두고 흰 배경만 걷어낸다.
//
// 흰 배경 위에 알파 a로 합성된 픽셀이라 보고 a와 원래 색을 역산한다.
// 알파만 낮추고 색을 그대로 두면 흰 배경과 섞여 선이 흐려진다
// (중간 회색 176이 흰 카드에서 230으로 보인다). 역산하면 흰 카드 위
// 겉모습이 원본과 픽셀 단위로 같으면서 배경만 사라진다.
//
// 이미 변환된 파일(알파 < 255)은 건드리지 않아 반복 실행해도 안전하다.
function toTransparent({ width, height, pixels }) {
  const out = Buffer.from(pixels);

  for (let i = 0; i < out.length; i += 4) {
    // 이미 변환된 파일에 남은 미미한 알파도 끊어내 재실행이 스스로 수습되게 한다.
    if (out[i + 3] !== 255) {
      if (out[i + 3] <= 2) out.fill(0, i, i + 4);
      continue;
    }

    // 거의 흰색(254 등)은 알파 1로 반올림되어 배경이 완전히 지워지지 않는다.
    // 눈에는 보이지 않지만 '배경은 투명' 규칙을 검사로 확인할 수 없게 되므로 끊어낸다.
    const alpha = 1 - Math.min(out[i], out[i + 1], out[i + 2]) / 255;
    if (Math.round(alpha * 255) <= 2) {
      out.fill(0, i, i + 4);
      continue;
    }

    for (let c = 0; c < 3; c += 1) {
      out[i + c] = Math.max(0, Math.min(255, Math.round((out[i + c] - (1 - alpha) * 255) / alpha)));
    }
    out[i + 3] = Math.round(alpha * 255);
  }

  return { width, height, pixels: out };
}

function isRed([r, g, b]) {
  return Math.max(r, g, b) - Math.min(r, g, b) > 40 && r === Math.max(r, g, b);
}

// 선화를 목표색 단색으로 칠하고, 원본의 '밝음'(=흰 배경에 가까움)을 알파로 옮긴다.
// 밝기를 곱해 음영을 흉내내면 안티에일리어싱 픽셀이 목표색보다 밝아져
// 라이트 배경에서 선이 사라진다. 그래서 색은 고정하고 커버리지만 바꾼다.
// 흰 배경 제거가 이 계산에 함께 흡수되므로 별도 단계가 없다.
function toDark({ width, height, pixels }) {
  const out = Buffer.from(pixels);

  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;

    const source = [out[i], out[i + 1], out[i + 2]];

    if (isRed(source)) {
      const min = Math.min(...source);
      const softness = min < 120 ? 1 : Math.max(0.35, 1 - (min - 120) / 160);
      [out[i], out[i + 1], out[i + 2]] = RED_TARGET;
      out[i + 3] = Math.round(out[i + 3] * softness);
      continue;
    }

    const coverage = Math.max(0, 1 - luminance(source) ** 0.45);
    const alpha = Math.round(out[i + 3] * coverage);
    if (alpha <= 2) {
      out.fill(0, i, i + 4);
    } else {
      [out[i], out[i + 1], out[i + 2]] = GRAY_TARGET;
      out[i + 3] = alpha;
    }
  }

  return { width, height, pixels: out };
}

// 배경 제거가 실제로 됐는지 모서리로 확인한다.
//
// 완전한 0을 요구하지 않는 이유: 원본 배경이 어디서나 순백은 아니라
// 251~246 같은 픽셀이 알파 3~9로 남는다. 이 값들은 두 카드 모두에서
// 보이지 않고(4% 미만), 이걸 0으로 끊으려면 임계값을 올려야 하는데
// 그러면 알파 3~5 구간의 실제 안티에일리어싱 8%가 함께 잘려 선이 딱딱해진다.
// 그래서 자산을 그대로 두고 검사에 허용치를 둔다.
const CORNER_ALPHA_TOLERANCE = 10;

function findOpaqueCorner({ width, height, pixels }) {
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  for (const [x, y] of corners) {
    const alpha = pixels[(y * width + x) * 4 + 3];
    if (alpha > CORNER_ALPHA_TOLERANCE) return alpha;
  }
  return null;
}

function collectLightIcons(directory = IMAGES_ROOT) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // dark/ 는 산출물이므로 입력에서 제외한다.
        return absolutePath === DARK_ROOT ? [] : collectLightIcons(absolutePath);
      }
      return entry.isFile() && entry.name.endsWith(".png") ? [absolutePath] : [];
    })
    .sort();
}

function darkPathFor(lightPath) {
  return path.join(DARK_ROOT, path.relative(IMAGES_ROOT, lightPath));
}

function printTargets() {
  console.log("다크 아이콘 목표색 (다크 카드 #161616, 비텍스트 기준 3:1)");
  [
    ["무채 선화", GRAY_TARGET],
    ["붉은 계열", RED_TARGET],
  ].forEach(([label, color]) => {
    const hex = color.map((v) => v.toString(16).padStart(2, "0")).join("");
    console.log(`- ${label} #${hex}: ${contrast(color, DARK_CARD).toFixed(2)}:1`);
  });
}

function generate({ check }) {
  const lightIcons = collectLightIcons();
  const errors = [];
  let written = 0;

  lightIcons.forEach((lightPath) => {
    const relativeLight = path.relative(PROJECT_ROOT, lightPath);
    const source = decodePng(lightPath);

    // 라이트: 색 유지 + 배경 제거. 두 벌의 구조를 같게 맞춘다.
    const lightImage = toTransparent(source);
    const light = encodePng(lightImage);
    if (check) {
      const opaqueCorner = findOpaqueCorner(lightImage);
      if (opaqueCorner !== null) {
        errors.push(`라이트 아이콘 모서리가 불투명합니다(alpha ${opaqueCorner}): ${relativeLight}`);
      }
    }
    if (check) {
      if (!fs.readFileSync(lightPath).equals(light)) {
        errors.push(`라이트 아이콘 배경이 투명하지 않습니다: ${relativeLight}`);
      }
    } else if (!fs.readFileSync(lightPath).equals(light)) {
      fs.writeFileSync(lightPath, light);
      written += 1;
    }

    // 다크: 라이트를 입력으로 색까지 치환.
    const darkPath = darkPathFor(lightPath);
    const relativeDark = path.relative(PROJECT_ROOT, darkPath);
    const darkImage = toDark(decodePng(lightPath));
    const dark = encodePng(darkImage);

    if (check) {
      const opaqueCorner = findOpaqueCorner(darkImage);
      if (opaqueCorner !== null) {
        errors.push(`다크 아이콘 모서리가 불투명합니다(alpha ${opaqueCorner}): ${relativeDark}`);
      }
    }

    if (check) {
      if (!fs.existsSync(darkPath)) {
        errors.push(`다크 아이콘이 없습니다: ${relativeDark}`);
      } else if (!fs.readFileSync(darkPath).equals(dark)) {
        errors.push(`다크 아이콘이 최신이 아닙니다: ${relativeDark}`);
      }
      return;
    }

    fs.mkdirSync(path.dirname(darkPath), { recursive: true });
    fs.writeFileSync(darkPath, dark);
    written += 1;
  });

  // 라이트에 짝이 없는 다크 아이콘이 남아 있으면 지운다(또는 오류로 알린다).
  const orphans = fs.existsSync(DARK_ROOT)
    ? collectLightIcons(DARK_ROOT).filter(
        (darkPath) =>
          !fs.existsSync(path.join(IMAGES_ROOT, path.relative(DARK_ROOT, darkPath))),
      )
    : [];

  orphans.forEach((darkPath) => {
    const relative = path.relative(PROJECT_ROOT, darkPath);
    if (check) errors.push(`짝 없는 다크 아이콘: ${relative}`);
    else fs.rmSync(darkPath);
  });

  return { total: lightIcons.length, written, orphans: orphans.length, errors };
}

function main() {
  const check = process.argv.includes("--check");

  try {
    printTargets();
    const { total, written, orphans, errors } = generate({ check });

    if (errors.length > 0) {
      console.error(`\nErrors (${errors.length}):`);
      errors.forEach((error) => console.error(`- ${error}`));
      console.error("\n`npm run generate:dark-icons`를 실행하세요.");
      process.exitCode = 1;
      return;
    }

    console.log(
      check
        ? `\nDark icons are up to date. (${total} icons)`
        : `\nGenerated ${written} icon files.${orphans ? ` Removed ${orphans} orphaned.` : ""}`,
    );
  } catch (error) {
    console.error(`Dark icon generation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  GRAY_TARGET,
  RED_TARGET,
  DARK_CARD,
  collectLightIcons,
  contrast,
  darkPathFor,
  decodePng,
  findOpaqueCorner,
  encodePng,
  toDark,
  toTransparent,
};
