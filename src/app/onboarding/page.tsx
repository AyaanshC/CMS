import EnquiryForm from "@/components/onboarding/EnquiryForm";
import {getPublicIntakeOptions} from "@/app/actions/onboarding";
export default async function OnboardingPage(){const config=await getPublicIntakeOptions();return <EnquiryForm options={config.options} studioName={config.name}/>;}
