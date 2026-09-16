import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildExportWorkbook } from "@/lib/export";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const months = request.nextUrl.searchParams.getAll("mes");
  const somenteCorrigidos = request.nextUrl.searchParams.get("somenteCorrigidos") === "1";

  const where: NonNullable<Parameters<typeof prisma.fuelRecord.findMany>[0]>["where"] = {
    hasError: false,
  };
  if (somenteCorrigidos) where.corrected = true;
  if (months.length > 0) {
    where.OR = months.map((mes) => {
      const [ano, mm] = mes.split("-").map(Number);
      const start = new Date(Date.UTC(ano, mm - 1, 1));
      const end = new Date(Date.UTC(ano, mm, 1));
      return { data: { gte: start, lt: end } };
    });
  }

  const records = await prisma.fuelRecord.findMany({
    where,
    orderBy: [{ placaTexto: "asc" }, { data: "asc" }],
  });

  const buffer = buildExportWorkbook(
    records.map((r) => ({
      placa: r.placaTexto,
      data: r.data,
      km: r.km,
      litros: r.litros,
      valorLitro: r.valorLitro,
      valorTotal: r.valorTotal,
      posto: r.posto,
      combustivel: r.combustivel,
      motorista: r.motorista,
      corrected: r.corrected,
      hasError: r.hasError,
    })),
  );

  const fileName = `abastecimentos_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
