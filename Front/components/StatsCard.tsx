import RimCard from "./RimCard";

export default function StatsCard({title,value}:{title:string,value:string}) {
  return(
    <RimCard>
      <div className="stat">{value}</div>
      <div>{title}</div>
    </RimCard>
  )
}