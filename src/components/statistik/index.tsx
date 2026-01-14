"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { fetchAllStatistikData } from "@/utils/api/statistik/fetch";
import { BookOpen, Users, Calendar, User } from "lucide-react"
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from "recharts"
import { useI18n } from "@/components/providers/i18n-provider"
import { useStatistikData } from "@/hooks/use-statistik-data";


interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry, index: number) => (
          <p
          key={index}
          className="text-sm dark:text-white"
          style={{ color: entry.color }}
        >
          {`${entry.name}: ${entry.value}`}
        </p>
        ))}
      </div>
    );
  }
  return null;
};

const KPICardSkeleton = () => (
  <Card className="bg-white dark:bg-gray-800 shadow-lg animate-pulse">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </CardContent>
  </Card>
)

const ChartSkeleton = () => (
  <Card className="bg-white dark:bg-gray-800 shadow-lg animate-pulse">
    <CardHeader>
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-center justify-center">
        <div className="space-y-4 w-full">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
        </div>
      </div>
    </CardContent>
  </Card>
)


export default function Statistik() {
  const { t, locale } = useI18n()
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current-month")
  const [totalSetoran, setTotalSetoran] = useState<{
    totalSetoranBulanIni: number;
    totalSetoranBulanLalu: number;
    persentase: number;
  }>({
    totalSetoranBulanIni: 0,
    totalSetoranBulanLalu: 0,
    persentase: 0,
  });
  const [totalPengguna, setTotalPengguna] = useState<{
    totalPenggunaBulanIni: number;
    totalPenggunaBulanLalu: number;
    persentase: number;
  }>({
    totalPenggunaBulanIni: 0,
    totalPenggunaBulanLalu: 0,
    persentase: 0,
  });
  const [totalGroups, setTotalGroups] = useState<{
    totalGroupsBulanIni: number;
    totalGroupsBulanLalu: number;
    persentase: number;
  }>({
    totalGroupsBulanIni: 0,
    totalGroupsBulanLalu: 0,
    persentase: 0,
  });
  const [groupSetoranTerbanyak, setGroupSetoranTerbanyak] = useState<{
    group_name: string;
    total: number;
  }[]>([]);
  const [monthlyStatsData, setMonthlyStatsData] = useState<{
    month: string;
    Recitations: number;
    Users: number;
    Groups: number;
  }[]>([]);

  const formattedData = groupSetoranTerbanyak.map(item => ({
    name: item.group_name, // ini yang akan tampil di tooltip
    value: item.total,
    color: "#8884d8"
  }));

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const months = []
    const currentDate = new Date()
    
    // Month names mapping
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ]
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthIndex = date.getMonth()
      const monthKey = monthNames[monthIndex]
      const monthName = t(`statistik.months.${monthKey}`)
      const year = date.getFullYear()
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.push({ value, label: `${monthName} ${year}` })
    }
    
    return months
  }

  const monthOptions = generateMonthOptions()

  // Compute start/end date based on selected period
  const { startDate, endDate } = (() => {
    if (selectedPeriod === "all") {
      return { startDate: "1970-01-01", endDate: "9999-12-31" }
    }
    else if (selectedPeriod === "current-year") {
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const s = `${year}-01-01`
      const e = `${year}-12-31`

      return { startDate: s, endDate: e }
    }
    else if (selectedPeriod === "current-month") {
      const currentDate = new Date()
      const s = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`
      const e = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`
      return { startDate: s, endDate: e }
    } else {
      const [year, month] = selectedPeriod.split('-')
      const s = `${year}-${month}-01`
      const e = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
      return { startDate: s, endDate: e }
    }
  })()

  const { data, isLoading } = useStatistikData({
    startDate,
    endDate,
  })

  // Update local states when hook data changes (preserve existing rendering logic)
  useEffect(() => {
    if (!data?.success || !data?.data) return
    const d = data.data
    setTotalSetoran(d.totalSetoran)
    setTotalPengguna(d.totalPengguna)
    setTotalGroups(d.totalGroups)
    setGroupSetoranTerbanyak(d.groupSetoranTerbanyak || [])
    
    // Transform chart data based on period type and API response
    const chartTimeSeriesData = d.chartTimeSeriesData || { type: 'monthly', data: {} };
    
    let monthlyStats: {
      month: string;
      Recitations: number;
      Users: number;
      Groups: number;
    }[] = [];
    
    if (chartTimeSeriesData.type === 'daily') {
      // Daily view for monthly periods - show data per day
      const dailyData = chartTimeSeriesData.data as { [key: string]: { users: number; groups: number; recitations: number } };
      
      // Create array from daily data
      monthlyStats = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dayKey, data]) => {
          const date = new Date(dayKey);
          const dayName = date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
          
          return {
            month: dayName, // Using "month" field but actually showing day
            Recitations: data.recitations,
            Users: data.users,
            Groups: data.groups,
          };
        });
        
    } else if (chartTimeSeriesData.type === 'monthly') {
      // Monthly view for yearly periods - show data per month
      const monthlyData = chartTimeSeriesData.data as { [key: string]: { users: number; groups: number; recitations: number } };
      
      // Create months array for the period
      const dataMonths = Object.keys(monthlyData).sort();
      
      if (dataMonths.length > 0) {
        // Use actual data months
        monthlyStats = dataMonths.map((monthKey) => {
          const date = new Date(monthKey + '-01');
          const monthName = date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
          const data = monthlyData[monthKey];
          
          return {
            month: monthName,
            Recitations: data.recitations,
            Users: data.users,
            Groups: data.groups,
          };
        });
      } else {
        // Fallback: create last 12 months with zero data
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthKey = date.toISOString().slice(0, 7);
          const monthName = date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
          const data = monthlyData[monthKey] || { users: 0, groups: 0, recitations: 0 };
          
          monthlyStats.push({
            month: monthName,
            Recitations: data.recitations,
            Users: data.users,
            Groups: data.groups,
          });
        }
      }
      
    } else if (chartTimeSeriesData.type === 'weekly') {
      // Weekly view for intermediate periods - show data per week
      const weeklyData = chartTimeSeriesData.data as { [key: string]: { users: number; groups: number; recitations: number } };
      
      monthlyStats = Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekKey, data]) => {
          return {
            month: weekKey, // Shows as "2025-W47" format
            Recitations: data.recitations,
            Users: data.users,
            Groups: data.groups,
          };
        });
    }
    setMonthlyStatsData(monthlyStats);
  }, [data])

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  function getRecitationLabel(selectedPeriod: string, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string, locale: string) {
    if (selectedPeriod === "all") {
      return t("statistik.recitation_all")
    }
  
    if (selectedPeriod === "current-year") {
      return t("statistik.recitation_this_year")
    }
  
    if (selectedPeriod === "current-month") {
      return t("statistik.recitation_this_month")
    }
  
    // Format custom: YYYY-MM
    const [year, month] = selectedPeriod.split("-")
    const namaBulan = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString(locale === "id" ? "id-ID" : "en-US", { month: "long" })
  
    return t("statistik.recitation_month", undefined, { month: namaBulan, year })
  }

  function getGroupsLabel(selectedPeriod: string, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string, locale: string) {
    if (selectedPeriod === "all") {
      return t("statistik.groups_all")
    }
  
    if (selectedPeriod === "current-year") {
      return t("statistik.groups_this_year")
    }
  
    if (selectedPeriod === "current-month") {
      return t("statistik.groups_this_month")
    }
  
    // Format custom: YYYY-MM
    const [year, month] = selectedPeriod.split("-")
    const namaBulan = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString(locale === "id" ? "id-ID" : "en-US", { month: "long" })
  
    return t("statistik.groups_month", undefined, { month: namaBulan, year })
  }

  function getUsersLabel(selectedPeriod: string, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string, locale: string) {
    if (selectedPeriod === "all") {
      return t("statistik.users_all")
    }
  
    if (selectedPeriod === "current-year") {
      return t("statistik.users_this_year")
    }
  
    if (selectedPeriod === "current-month") {
      return t("statistik.users_this_month")
    }
  
    // Format custom: YYYY-MM
    const [year, month] = selectedPeriod.split("-")
    const namaBulan = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString(locale === "id" ? "id-ID" : "en-US", { month: "long" })
  
    return t("statistik.users_month", undefined, { month: namaBulan, year })
  }
  
  function getChartTitle(selectedPeriod: string, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string) {
    if (selectedPeriod === "all") {
      return t("statistik.monthly_statistics"); // All time shows monthly data
    }
    if (selectedPeriod === "current-year") {
      return t("statistik.monthly_statistics"); // Year shows monthly data
    }
    if (selectedPeriod === "current-month") {
      return t("statistik.daily_statistics", "Daily Statistics"); // Month shows daily data
    }
    // For specific months (YYYY-MM), show daily data
    return t("statistik.daily_statistics", "Daily Statistics");
  }


  return (
    <div className="min-h-screen p-4 md:pt-8">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-4">
        {/* Header */}
        <div className="mb-2 md:mb-4 flex flex-col gap-3 md:gap-5 sm:flex-row sm:gap-0 justify-between">
          {isLoading ? (
            <Skeleton className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("statistik.dashboard")}</h1>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {isLoading ? (
              <div className="flex gap-3 items-center w-full">
                <Skeleton className="h-10 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ) : (
              <>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("statistik.period")}:</span>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder={t("statistik.period")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("statistik.all")}</SelectItem>
                      <SelectItem value="current-year">{t("statistik.this_year")}</SelectItem>
                      <SelectItem value="current-month">{t("statistik.this_month")}</SelectItem>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>


        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : (
            <>
              {/* Total Setoran */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {isLoading ? (
                        <Skeleton className="h-4 w-32 mb-2" />
                      ) : (
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{getRecitationLabel(selectedPeriod, t, locale)}</p>
                      )}
                      {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalSetoran.totalSetoranBulanIni}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pengguna */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {isLoading ? (
                        <Skeleton className="h-4 w-32 mb-2" />
                      ) : (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{getUsersLabel(selectedPeriod, t, locale)}</p>
                      )}
                      {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {totalPengguna.totalPenggunaBulanIni}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>



              {/* Total Groups */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {isLoading ? (
                        <Skeleton className="h-4 w-32 mb-2" />
                      ) : (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{getGroupsLabel(selectedPeriod, t, locale)}</p>
                      )}
                      {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalGroups.totalGroupsBulanIni}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {isLoading ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              {/* Group Setoran Terbanyak - Pie Chart */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isLoading ? (
                      <Skeleton className="h-6 w-48" />
                    ) : (
                      t("statistik.top_recitation_group")
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!isLoading && groupSetoranTerbanyak && formattedData && groupSetoranTerbanyak.length > 0 ? (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                data={formattedData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name} : ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                              {groupSetoranTerbanyak.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#8884d8' : index === 1 ? '#14b8a6' : index === 2 ? '#f59e0b' : '#f97316'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {groupSetoranTerbanyak.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: `${index === 0 ? '#8884d8' : index === 1 ? '#14b8a6' : index === 2 ? '#f59e0b' : '#f97316'}`}}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{item.group_name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : !isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">{t("statistik.no_data.deposit_group")}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t("statistik.no_data.selected_period")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="space-y-4 w-full">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Statistics - Bar Chart */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isLoading ? (
                      <Skeleton className="h-6 w-48" />
                    ) : (
                      getChartTitle(selectedPeriod, t)
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!isLoading && monthlyStatsData && monthlyStatsData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyStatsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="Recitations"  name={t("statistik.recitations")} fill="#3b82f6" />
                          <Bar dataKey="Users" name={t("statistik.users_all")} fill="#14b8a6" />
                          <Bar dataKey="Groups" name={t("statistik.groups_all")} fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : !isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">No monthly statistics data</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t("statistik.no_data.selected_period")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="space-y-4 w-full">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
