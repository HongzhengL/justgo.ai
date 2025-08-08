import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import ActivityCard from "./ActivityCard.jsx";

export default function ActivityCardList({ cards, onLink }) {
    if (!cards?.length) return null;
    return (
        <Swiper spaceBetween={12} slidesPerView={"auto"} className="card-swiper">
            {cards.map((c) => (
                <SwiperSlide style={{ width: 280 }} key={c.id || c.title}>
                    <ActivityCard activity={c} onLink={onLink} />
                </SwiperSlide>
            ))}
        </Swiper>
    );
}
