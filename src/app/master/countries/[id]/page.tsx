import { CountryDetail } from "@/components/masterdata/country-detail"

interface PageProps {
    params: {
        id: string
    }
}

export default function CountryDetailPage({ params }: PageProps) {
    return (
        <div className="container mx-auto py-6 max-w-7xl">
            <CountryDetail id={params.id} />
        </div>
    )
}
