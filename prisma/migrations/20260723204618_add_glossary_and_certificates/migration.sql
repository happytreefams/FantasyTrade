-- CreateEnum
CREATE TYPE "CertificateScope" AS ENUM ('COURSE', 'CATEGORY');

-- CreateTable
CREATE TABLE "Glossary" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "relatedLessonId" TEXT,

    CONSTRAINT "Glossary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "CertificateScope" NOT NULL,
    "courseId" TEXT,
    "category" "CourseCategory",
    "title" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Glossary_term_key" ON "Glossary"("term");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_scope_courseId_category_key" ON "Certificate"("userId", "scope", "courseId", "category");

-- AddForeignKey
ALTER TABLE "Glossary" ADD CONSTRAINT "Glossary_relatedLessonId_fkey" FOREIGN KEY ("relatedLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
