// @ts-nocheck
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TemplateIcon from '@/components/TemplateIcon/TemplateIcon';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import { getTemplateBySlug, getAllSlugs, getRelatedTemplates, BADGES, CATEGORIES } from '@/data/templates';
import styles from './detail.module.css';

import TemplateDetailClient from '@/components/TemplateDetailClient/TemplateDetailClient';

// Pre-render all template pages at build time
export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: any) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) return {};
  return {
    title: `${template.name} (${template.nameVi}) — Tina MiniGame`,
    description: template.description,
  };
}

export default async function TemplateDetailPage({ params }: any) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const related = getRelatedTemplates(slug, 4);
  const category = CATEGORIES.find(c => c.id === template.category);

  return <TemplateDetailClient template={template} related={related} category={category} />;
}
