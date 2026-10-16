import { FinalCta } from '@/components/landing-page-section/FinalCTA-Section'
import { Privacy } from '@/components/landing-page-section/PrivacySection'
import { ServiceSection } from '@/components/ServiceSection'
import { Lock } from 'lucide-react'

function UnderstandDocPage() {
    return (
        <main>
            <ServiceSection
                bannerTitle="Understand what matters."
                bannerSubtitle="Upload a foreign prescription, lab report, or medical document to get an instant translation and a clear, plain-language explanation."
                title="Understand foreign prescriptions and medical notes."
                description="Upload any foreign prescription, lab report, or packaging for an instant plain-language explanation."
                features={[
                    { text: "Plain-language dosage, meal timing & allergy alerts" },
                    { icon: Lock, text: "100% private & client-side (no account needed)" },
                ]}
                cta={{ label: "Start document translation", href: "/documents/start" }}
                ctaNote="~2 minutes · No account required"
                disclaimer="WellAbroad is a medical communication aid, not a diagnostic service. In an emergency, call emergency number."
                copyright="© 2026 WellAbroad"
            />
            <Privacy />
            <FinalCta />
        </main>
    )
}

export default UnderstandDocPage