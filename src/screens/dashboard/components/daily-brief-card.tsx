'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { RefreshIcon } from '@hugeicons/core-free-icons'
import { fetchLatestBriefing, generateBriefingNow } from '@/lib/briefings-api'
import { DailyBriefModal } from './daily-brief-modal'
import { toast } from '@/components/ui/toast'
import type { DailyBriefing } from '@/types/daily-brief'

export function DailyBriefCard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const {
    data: briefing,
    isLoading,
    isError,
  } = useQuery<DailyBriefing | null>({
    queryKey: ['daily-brief', 'latest'],
    queryFn: () => fetchLatestBriefing(true),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const generateMutation = useMutation({
    mutationFn: () => generateBriefingNow({ isManual: true, force: true }),
    onSuccess: (newBriefing) => {
      queryClient.setQueryData(['daily-brief', 'latest'], newBriefing)
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] })
      toast.success('Daily brief generated successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to generate daily brief')
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate()
  }

  return (
    <>
      <div
        className="relative flex flex-col overflow-hidden rounded-xl border border-neutral-800 transition-colors bg-[#121316] p-5 shadow-sm"
        style={{
          background: 'var(--theme-card)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, #6366f1, #a855f7 50%, transparent)',
          }}
        />

        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              👔
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">
                  Chief of Staff Daily Brief
                </h3>
                {briefing && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      briefing.isManual
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {briefing.isManual ? 'Manual Run' : 'Scheduled Morning Brief'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {briefing
                  ? `Generated ${new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Period: ${briefing.periodCovered}`
                  : 'Daily executive briefing for department operations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={generateMutation.isPending}
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700/70 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Run daily briefing pipeline now"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={`w-3.5 h-3.5 ${generateMutation.isPending ? 'animate-spin' : ''}`}
              />
              {generateMutation.isPending ? 'Generating...' : 'Generate Brief Now'}
            </button>
            {briefing && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/60 rounded-lg transition-colors cursor-pointer"
              >
                Open Full Brief &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="pt-3">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-neutral-400">
              Loading latest daily briefing...
            </div>
          ) : isError || !briefing ? (
            <div className="py-5 text-center flex flex-col items-center justify-center gap-2">
              <p className="text-xs text-neutral-400">
                No briefing generated for today yet.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate First Brief'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Executive Summary */}
              <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                {briefing.summary}
              </p>

              {/* Status Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div
                  onClick={() => navigate({ to: '/inbox' })}
                  className="flex flex-col p-2.5 rounded-lg border border-rose-900/40 bg-rose-950/20 cursor-pointer hover:border-rose-700/60 transition-colors"
                >
                  <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
                    Needs Attention
                  </span>
                  <span className="text-lg font-bold text-rose-300">
                    {briefing.sourceSummaryCounts.needsAttentionCount}
                  </span>
                </div>

                <div
                  onClick={() => navigate({ to: '/inbox' })}
                  className="flex flex-col p-2.5 rounded-lg border border-amber-900/40 bg-amber-950/20 cursor-pointer hover:border-amber-700/60 transition-colors"
                >
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                    Waiting / Review
                  </span>
                  <span className="text-lg font-bold text-amber-300">
                    {briefing.sourceSummaryCounts.waitingCount}
                  </span>
                </div>

                <div className="flex flex-col p-2.5 rounded-lg border border-indigo-900/40 bg-indigo-950/20">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                    In Progress
                  </span>
                  <span className="text-lg font-bold text-indigo-300">
                    {briefing.sourceSummaryCounts.inProgressCount}
                  </span>
                </div>

                <div className="flex flex-col p-2.5 rounded-lg border border-emerald-900/40 bg-emerald-950/20">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Cash Reserves
                  </span>
                  <span className="text-lg font-bold text-emerald-300 truncate">
                    {briefing.sourceSummaryCounts.totalCashBalance !== undefined &&
                    briefing.sourceSummaryCounts.totalCashBalance > 0
                      ? `${briefing.sourceSummaryCounts.currency || 'MYR'} ${briefing.sourceSummaryCounts.totalCashBalance.toLocaleString()}`
                      : 'RM 0.00'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Modal Viewer */}
      <DailyBriefModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        briefing={briefing || null}
        onRefresh={handleGenerate}
        isRefreshing={generateMutation.isPending}
      />
    </>
  )
}
