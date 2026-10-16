import { FinalCta } from '@/components/landing-page-section/FinalCTA-Section'
import { Privacy } from '@/components/landing-page-section/PrivacySection'
import { ServiceSection } from '@/components/ServiceSection'

function DescribeSymptomsPage() {
    return (
        <main>
            <ServiceSection
                bannerTitle="Be understood anywhere."
                bannerSubtitle="A 2-minute guided clinical intake that translates how you feel into verified local medical terminology for physicians, triage desks, and community pharmacies."
                title="Describe your symptoms in your language."
                description="A 2-minute guided intake that translates how you feel into local medical terms for doctors and pharmacies abroad."
                features={[
                    { text: "Plain words converted into local clinical terminology" },
                    { text: "Presentable on your phone screen or exportable as a summary" },
                ]}
                cta={{ label: "Start symptom assessment", href: "/symptoms/start" }}
                ctaNote="~2 minutes · No account required"
                disclaimer="WellAbroad is a medical communication aid, not a diagnostic service. In an emergency, call emergency number."
                copyright="© 2026 WellAbroad"
            />
            <Privacy />
            <FinalCta />
        </main>
    )
}

export default DescribeSymptomsPage